import { createHash } from "crypto";
import { MAX_GENERATION_RETRIES } from "./config";
import { DelayCalculator } from "./delay-calculator";
import { ListingAnalyzer } from "./listing-analyzer";
import {
	type ListingSignals,
	type Message,
	FollowUpStage,
	MessageVariant,
	createMessage,
} from "./models";
import { PersonalizationEngine } from "./personalization";
import { PostProcessor } from "./post-processor";
import { Safeguard } from "./safeguard";
import { SpamGuard } from "./spam-guard";
import { buildFollowupPrompt, buildGenerationPrompt } from "./templates";

const SKIP_TOKEN = "[SKIP]";

export interface LLMClient {
	generate(systemPrompt: string, userPrompt: string): Promise<string>;
}

export interface MessageResult {
	message: Message | null;
	skipped: boolean;
	delayMs: number;
}

export class MessageGenerationError extends Error {}

export class MessageGenerator {
	private llm: LLMClient;
	private analyzer = new ListingAnalyzer();
	private personalizer = new PersonalizationEngine();
	private spamGuard: SpamGuard;
	private postProcessor = new PostProcessor();
	private safeguard: Safeguard;
	private delay: DelayCalculator;
	private sentHashes = new Set<string>();

	constructor(llmClient: LLMClient, opts: { testMode?: boolean } = {}) {
		this.llm = llmClient;
		this.spamGuard = new SpamGuard(llmClient);
		this.safeguard = new Safeguard(llmClient);
		this.delay = new DelayCalculator({ testMode: opts.testMode });
	}

	async generate(
		rawListingText: string,
		listingId = "",
		listingUrl = "",
		variant?: MessageVariant,
	): Promise<MessageResult> {
		const signals = this.analyzer.analyze(
			rawListingText,
			listingId,
			listingUrl,
		);
		const personalization = this.personalizer.personalize(signals);

		if (!variant) {
			variant = personalization.recommendedVariants[0];
		}

		return this.generateWithRetries(signals, personalization, variant, true);
	}

	async generateAllVariants(
		rawListingText: string,
		listingId = "",
		listingUrl = "",
	): Promise<Map<MessageVariant, MessageResult>> {
		const signals = this.analyzer.analyze(
			rawListingText,
			listingId,
			listingUrl,
		);
		const personalization = this.personalizer.personalize(signals);

		const results = new Map<MessageVariant, MessageResult>();
		for (const v of Object.values(MessageVariant)) {
			try {
				const result = await this.generateWithRetries(
					signals,
					personalization,
					v as MessageVariant,
					true,
				);
				results.set(v as MessageVariant, result);
			} catch (e) {
				if (e instanceof MessageGenerationError) {
					console.warn(
						`Variant ${v} failed all retries for listing ${listingId}`,
					);
				} else {
					throw e;
				}
			}
		}
		return results;
	}

	async generateFollowup(
		rawListingText: string,
		stage: FollowUpStage,
		listingId = "",
		listingUrl = "",
	): Promise<MessageResult> {
		if (
			stage !== FollowUpStage.FOLLOWUP_1 &&
			stage !== FollowUpStage.FOLLOWUP_2
		) {
			throw new Error(`Invalid follow-up stage: ${stage}`);
		}

		const signals = this.analyzer.analyze(
			rawListingText,
			listingId,
			listingUrl,
		);
		const stageNum = stage === FollowUpStage.FOLLOWUP_1 ? 1 : 2;

		let [systemPrompt, userPrompt] = buildFollowupPrompt(signals, stageNum);

		for (let attempt = 1; attempt <= MAX_GENERATION_RETRIES + 1; attempt++) {
			const rawMessage = this.cleanMessage(
				(await this.llm.generate(systemPrompt, userPrompt)).trim(),
			);

			if (this.isSkip(rawMessage)) {
				console.info(`Follow-up for ${listingId} skipped by agent decision`);
				const delayResult = this.delay.calculate(0, false);
				return { message: null, skipped: true, delayMs: delayResult.delayMs };
			}

			// Pipeline: PostProcess → SpamGuard → Safeguard
			const processed = this.postProcessor.process(rawMessage);
			const validation = await this.spamGuard.validate(processed, signals);

			if (validation.passed && !this.isDuplicate(processed)) {
				const safeguardResult = await this.safeguard.check(processed);
				if (!safeguardResult.passed) {
					if (attempt <= MAX_GENERATION_RETRIES) {
						userPrompt +=
							`\n\nVORHERIGER VERSUCH ABGELEHNT: ${safeguardResult.reason}` +
							"\nBitte korrigiere diese Probleme.";
						console.info(
							`Follow-up attempt ${attempt} rejected by safeguard: ${safeguardResult.reason}`,
						);
						continue;
					}
				}

				this.sentHashes.add(this.hash(processed));
				this.delay.markActive();
				const delayResult = this.delay.calculate(processed.length, false);

				const message = createMessage(
					processed,
					MessageVariant.DIRECT_HONEST,
					listingId,
					{
						listingUrl,
						spamGuardScore: validation.score,
						generationAttempt: attempt,
						stage,
					},
				);
				return { message, skipped: false, delayMs: delayResult.delayMs };
			}

			if (attempt <= MAX_GENERATION_RETRIES) {
				userPrompt +=
					`\n\nVORHERIGER VERSUCH ABGELEHNT: ${validation.rejectionReasons.join("; ")}` +
					"\nBitte korrigiere diese Probleme.";
				console.info(
					`Follow-up attempt ${attempt} rejected: ${validation.rejectionReasons.join("; ")}`,
				);
			}
		}

		throw new MessageGenerationError(
			`Follow-up generation failed after ${MAX_GENERATION_RETRIES + 1} attempts`,
		);
	}

	analyzeListing(rawListingText: string): ListingSignals {
		return this.analyzer.analyze(rawListingText);
	}

	private isSkip(message: string): boolean {
		const cleaned = message.trim().toUpperCase();
		return cleaned === SKIP_TOKEN || cleaned === "[SKIP]";
	}

	private async generateWithRetries(
		signals: ListingSignals,
		personalization: ReturnType<PersonalizationEngine["personalize"]>,
		variant: MessageVariant,
		isFirstInConversation: boolean,
	): Promise<MessageResult> {
		let [systemPrompt, userPrompt] = buildGenerationPrompt(
			signals,
			personalization,
			variant,
		);

		for (let attempt = 1; attempt <= MAX_GENERATION_RETRIES + 1; attempt++) {
			const rawMessage = this.cleanMessage(
				(await this.llm.generate(systemPrompt, userPrompt)).trim(),
			);

			if (this.isSkip(rawMessage)) {
				console.info(
					`Variant ${variant} for ${signals.listingId} skipped by agent decision`,
				);
				const delayResult = this.delay.calculate(0, isFirstInConversation);
				return { message: null, skipped: true, delayMs: delayResult.delayMs };
			}

			// Pipeline: PostProcess → SpamGuard → Safeguard
			const processed = this.postProcessor.process(rawMessage);
			const validation = await this.spamGuard.validate(processed, signals);

			if (validation.passed && !this.isDuplicate(processed)) {
				const safeguardResult = await this.safeguard.check(processed);
				if (!safeguardResult.passed) {
					if (attempt <= MAX_GENERATION_RETRIES) {
						userPrompt +=
							`\n\nVORHERIGER VERSUCH ABGELEHNT: ${safeguardResult.reason}` +
							"\nBitte korrigiere diese Probleme.";
						console.info(
							`Variant ${variant} attempt ${attempt} rejected by safeguard: ${safeguardResult.reason}`,
						);
						continue;
					}
				}

				this.sentHashes.add(this.hash(processed));
				this.delay.markActive();
				const delayResult = this.delay.calculate(
					processed.length,
					isFirstInConversation,
				);

				const message = createMessage(processed, variant, signals.listingId, {
					listingUrl: signals.listingUrl,
					spamGuardScore: validation.score,
					generationAttempt: attempt,
				});
				return { message, skipped: false, delayMs: delayResult.delayMs };
			}

			if (attempt <= MAX_GENERATION_RETRIES) {
				userPrompt +=
					`\n\nVORHERIGER VERSUCH ABGELEHNT: ${validation.rejectionReasons.join("; ")}` +
					"\nBitte korrigiere diese Probleme.";
				console.info(
					`Variant ${variant} attempt ${attempt} rejected: ${validation.rejectionReasons.join("; ")}`,
				);
			}
		}

		throw new MessageGenerationError(
			`Variant ${variant} failed after ${MAX_GENERATION_RETRIES + 1} attempts for listing ${signals.listingId}`,
		);
	}

	private cleanMessage(text: string): string {
		let cleaned = text;
		if (cleaned.startsWith('"') && cleaned.endsWith('"'))
			cleaned = cleaned.slice(1, -1);
		if (cleaned.startsWith("'") && cleaned.endsWith("'"))
			cleaned = cleaned.slice(1, -1);

		const prefixes = [
			"Hier ist die Nachricht:",
			"Nachricht:",
			"Hier ist mein Vorschlag:",
		];
		for (const prefix of prefixes) {
			if (cleaned.startsWith(prefix)) {
				cleaned = cleaned.slice(prefix.length).trim();
			}
		}
		return cleaned.trim();
	}

	private hash(message: string): string {
		const normalized = message.toLowerCase().replace(/\s+/g, " ").trim();
		return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
	}

	private isDuplicate(message: string): boolean {
		return this.sentHashes.has(this.hash(message));
	}
}
