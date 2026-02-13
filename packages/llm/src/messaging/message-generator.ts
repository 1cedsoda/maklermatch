import { createHash } from "crypto";
import { MAX_GENERATION_RETRIES } from "./config";
import { DelayCalculator } from "./delay-calculator";
import { ListingAnalyzer } from "./listing-analyzer";
import { ListingGate } from "./listing-gate";
import {
	type BrokerCriteria,
	type GateResult,
	type ListingSignals,
	type Message,
	FollowUpStage,
	createMessage,
} from "./models";
import { PersonalizationEngine } from "./personalization";
import { PostProcessor } from "./post-processor";
import { Safeguard } from "./safeguard";
import { SpamGuard } from "./spam-guard";
import {
	type MessagePersona,
	buildFollowupPrompt,
	buildGenerationPrompt,
} from "./templates";

const SKIP_TOKEN = "[SKIP]";

export interface LLMClient {
	generate(systemPrompt: string, userPrompt: string): Promise<string>;
}

export interface MessageResult {
	message: Message | null;
	skipped: boolean;
	delayMs: number;
	gateResult?: GateResult;
}

export class MessageGenerationError extends Error {}

export class MessageGenerator {
	private llm: LLMClient;
	private analyzer = new ListingAnalyzer();
	private personalizer = new PersonalizationEngine();
	private gate: ListingGate;
	private spamGuard: SpamGuard;
	private postProcessor = new PostProcessor();
	private safeguard: Safeguard;
	private delay: DelayCalculator;
	private persona?: MessagePersona;
	private brokerCriteria?: BrokerCriteria;
	private sentHashes = new Set<string>();

	constructor(
		llmClient: LLMClient,
		opts: {
			testMode?: boolean;
			persona?: MessagePersona;
			brokerCriteria?: BrokerCriteria;
		} = {},
	) {
		this.llm = llmClient;
		this.gate = new ListingGate(llmClient);
		this.spamGuard = new SpamGuard(llmClient);
		this.safeguard = new Safeguard(llmClient);
		this.delay = new DelayCalculator({ testMode: opts.testMode });
		this.persona = opts.persona;
		this.brokerCriteria = opts.brokerCriteria;
	}

	async generate(
		rawListingText: string,
		listingId = "",
		listingUrl = "",
		sellerName = "",
	): Promise<MessageResult> {
		const signals = this.analyzer.analyze(
			rawListingText,
			listingId,
			listingUrl,
			sellerName,
		);

		const gateResult = await this.gate.check(signals, this.brokerCriteria);
		if (!gateResult.passed) {
			console.info(
				`Listing ${listingId} rejected by gate: [${gateResult.rejectionType}] ${gateResult.rejectionReason}`,
			);
			return { message: null, skipped: true, delayMs: 0, gateResult };
		}

		const personalization = this.personalizer.personalize(signals);

		let [systemPrompt, userPrompt] = buildGenerationPrompt(
			signals,
			personalization,
			this.persona,
		);

		for (let attempt = 1; attempt <= MAX_GENERATION_RETRIES + 1; attempt++) {
			const rawMessage = this.cleanMessage(
				(await this.llm.generate(systemPrompt, userPrompt)).trim(),
			);

			if (this.isSkip(rawMessage)) {
				console.info(`Listing ${listingId} skipped by agent decision`);
				const delayResult = this.delay.calculate(0, true);
				return { message: null, skipped: true, delayMs: delayResult.delayMs };
			}

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
							`Attempt ${attempt} rejected by safeguard: ${safeguardResult.reason}`,
						);
						continue;
					}
				}

				this.sentHashes.add(this.hash(processed));
				this.delay.markActive();
				const delayResult = this.delay.calculate(processed.length, true);

				const message = createMessage(processed, listingId, {
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
					`Attempt ${attempt} rejected: ${validation.rejectionReasons.join("; ")}`,
				);
			}
		}

		throw new MessageGenerationError(
			`Generation failed after ${MAX_GENERATION_RETRIES + 1} attempts for listing ${listingId}`,
		);
	}

	async generateFollowup(
		rawListingText: string,
		stage: FollowUpStage,
		listingId = "",
		listingUrl = "",
		sellerName = "",
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
			sellerName,
		);

		const gateResult = await this.gate.check(signals, this.brokerCriteria);
		if (!gateResult.passed) {
			console.info(
				`Follow-up for ${listingId} rejected by gate: [${gateResult.rejectionType}] ${gateResult.rejectionReason}`,
			);
			return { message: null, skipped: true, delayMs: 0, gateResult };
		}

		const stageNum = stage === FollowUpStage.FOLLOWUP_1 ? 1 : 2;

		let [systemPrompt, userPrompt] = buildFollowupPrompt(
			signals,
			stageNum,
			this.persona,
		);

		for (let attempt = 1; attempt <= MAX_GENERATION_RETRIES + 1; attempt++) {
			const rawMessage = this.cleanMessage(
				(await this.llm.generate(systemPrompt, userPrompt)).trim(),
			);

			if (this.isSkip(rawMessage)) {
				console.info(`Follow-up for ${listingId} skipped by agent decision`);
				const delayResult = this.delay.calculate(0, false);
				return { message: null, skipped: true, delayMs: delayResult.delayMs };
			}

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

				const message = createMessage(processed, listingId, {
					listingUrl,
					spamGuardScore: validation.score,
					generationAttempt: attempt,
					stage,
				});
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

	analyzeListing(rawListingText: string, sellerName = ""): ListingSignals {
		return this.analyzer.analyze(rawListingText, "", "", sellerName);
	}

	private isSkip(message: string): boolean {
		const cleaned = message.trim().toUpperCase();
		return cleaned === SKIP_TOKEN || cleaned === "[SKIP]";
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
