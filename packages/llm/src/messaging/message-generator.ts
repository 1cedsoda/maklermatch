import { createHash } from "crypto";
import { MAX_GENERATION_RETRIES } from "./config";
import { ListingAnalyzer } from "./listing-analyzer";
import {
	type ListingSignals,
	type Message,
	FollowUpStage,
	MessageVariant,
	createMessage,
} from "./models";
import { PersonalizationEngine } from "./personalization";
import { SpamGuard } from "./spam-guard";
import { buildFollowupPrompt, buildGenerationPrompt } from "./templates";

export interface LLMClient {
	generate(systemPrompt: string, userPrompt: string): Promise<string>;
}

export class MessageGenerationError extends Error {}

export class MessageGenerator {
	private llm: LLMClient;
	private analyzer = new ListingAnalyzer();
	private personalizer = new PersonalizationEngine();
	private spamGuard: SpamGuard;
	private sentHashes = new Set<string>();

	constructor(llmClient: LLMClient) {
		this.llm = llmClient;
		this.spamGuard = new SpamGuard(llmClient);
	}

	async generate(
		rawListingText: string,
		listingId = "",
		listingUrl = "",
		variant?: MessageVariant,
	): Promise<Message> {
		const signals = this.analyzer.analyze(
			rawListingText,
			listingId,
			listingUrl,
		);
		const personalization = this.personalizer.personalize(signals);

		if (!variant) {
			variant = personalization.recommendedVariants[0];
		}

		return this.generateWithRetries(signals, personalization, variant);
	}

	async generateAllVariants(
		rawListingText: string,
		listingId = "",
		listingUrl = "",
	): Promise<Map<MessageVariant, Message>> {
		const signals = this.analyzer.analyze(
			rawListingText,
			listingId,
			listingUrl,
		);
		const personalization = this.personalizer.personalize(signals);

		const results = new Map<MessageVariant, Message>();
		for (const v of Object.values(MessageVariant)) {
			try {
				const msg = await this.generateWithRetries(
					signals,
					personalization,
					v as MessageVariant,
				);
				results.set(v as MessageVariant, msg);
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
	): Promise<Message> {
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

			const validation = await this.spamGuard.validate(rawMessage, signals);

			if (validation.passed && !this.isDuplicate(rawMessage)) {
				this.sentHashes.add(this.hash(rawMessage));
				return createMessage(
					rawMessage,
					MessageVariant.SPECIFIC_OBSERVER,
					listingId,
					{
						listingUrl,
						spamGuardScore: validation.score,
						generationAttempt: attempt,
						stage,
					},
				);
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

	private async generateWithRetries(
		signals: ListingSignals,
		personalization: ReturnType<PersonalizationEngine["personalize"]>,
		variant: MessageVariant,
	): Promise<Message> {
		let [systemPrompt, userPrompt] = buildGenerationPrompt(
			signals,
			personalization,
			variant,
		);

		for (let attempt = 1; attempt <= MAX_GENERATION_RETRIES + 1; attempt++) {
			const rawMessage = this.cleanMessage(
				(await this.llm.generate(systemPrompt, userPrompt)).trim(),
			);

			const validation = await this.spamGuard.validate(rawMessage, signals);

			if (validation.passed && !this.isDuplicate(rawMessage)) {
				this.sentHashes.add(this.hash(rawMessage));
				return createMessage(rawMessage, variant, signals.listingId, {
					listingUrl: signals.listingUrl,
					spamGuardScore: validation.score,
					generationAttempt: attempt,
				});
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
