import { QUALITY_CHECK } from "@scraper/agent";
import {
	FORBIDDEN_OPENERS,
	FORBIDDEN_PHRASES,
	FORBIDDEN_WORDS,
	MAX_EXCLAMATION_MARKS,
	MAX_QUESTION_MARKS,
	MAX_WORDS,
	MIN_QUALITY_SCORE,
} from "./config";
import type { ListingSignals } from "./models";
import type { LLMClient } from "./message-generator";

export interface ValidationResult {
	passed: boolean;
	score: number;
	rejectionReasons: string[];
}

export class SpamGuard {
	private llm: LLMClient | null;

	constructor(llmClient: LLMClient | null = null) {
		this.llm = llmClient;
	}

	async validate(
		message: string,
		signals: ListingSignals,
	): Promise<ValidationResult> {
		const reasons: string[] = [];

		// Layer 1: Rule-based checks
		reasons.push(...this.checkForbiddenWords(message));
		reasons.push(...this.checkForbiddenPhrases(message));
		reasons.push(...this.checkForbiddenOpeners(message));
		reasons.push(...this.checkStructure(message));
		reasons.push(...this.checkPersonalization(message, signals));
		reasons.push(...this.checkSelfFocus(message));
		reasons.push(...this.checkSellerName(message, signals));

		if (reasons.length > 0) {
			return { passed: false, score: 0, rejectionReasons: reasons };
		}

		// Layer 2: LLM quality check (if client available)
		if (this.llm) {
			const score = await this.llmQualityCheck(message);
			if (score < MIN_QUALITY_SCORE) {
				return {
					passed: false,
					score,
					rejectionReasons: [
						`LLM-Qualitätsscore ${score}/10 -- unter Minimum von ${MIN_QUALITY_SCORE}`,
					],
				};
			}
			return { passed: true, score, rejectionReasons: [] };
		}

		return { passed: true, score: 0, rejectionReasons: [] };
	}

	private checkForbiddenWords(message: string): string[] {
		const reasons: string[] = [];
		const msgLower = message.toLowerCase();
		for (const word of FORBIDDEN_WORDS) {
			if (msgLower.includes(word.toLowerCase())) {
				reasons.push(`Verbotenes Wort: '${word}'`);
			}
		}
		return reasons;
	}

	private checkForbiddenPhrases(message: string): string[] {
		const reasons: string[] = [];
		const msgLower = message.toLowerCase();
		for (const phrase of FORBIDDEN_PHRASES) {
			if (msgLower.includes(phrase.toLowerCase())) {
				reasons.push(`Verbotene Phrase: '${phrase}'`);
			}
		}
		return reasons;
	}

	private checkForbiddenOpeners(message: string): string[] {
		const stripped = message.trim();
		for (const opener of FORBIDDEN_OPENERS) {
			if (stripped.startsWith(opener)) {
				return [`Verbotener Anfang: '${opener}...'`];
			}
		}
		return [];
	}

	private checkStructure(message: string): string[] {
		const reasons: string[] = [];
		const wordCount = message.split(/\s+/).length;

		if (wordCount > MAX_WORDS) {
			reasons.push(`Zu lang: ${wordCount} Wörter (max ${MAX_WORDS})`);
		}

		const exclCount = (message.match(/!/g) ?? []).length;
		if (exclCount > MAX_EXCLAMATION_MARKS) {
			reasons.push(
				`Zu viele Ausrufezeichen: ${exclCount} (max ${MAX_EXCLAMATION_MARKS})`,
			);
		}

		const questionCount = (message.match(/\?/g) ?? []).length;
		if (questionCount > MAX_QUESTION_MARKS) {
			reasons.push(
				`Zu viele Fragezeichen: ${questionCount} (max ${MAX_QUESTION_MARKS})`,
			);
		}

		if (questionCount === 0) {
			reasons.push(
				"Kein Fragezeichen -- Nachricht braucht mindestens eine Frage",
			);
		}

		// Message should contain a question but doesn't need to END with ?
		// because a greeting/sign-off can follow the question (Erstkontakt)

		if (/https?:\/\/|www\./i.test(message)) {
			reasons.push("Enthält URL -- nicht erlaubt");
		}

		// Check for all-lowercase style (no uppercase letters at all or only at very start)
		const sentences = message.split(/[.!?]\s+/);
		const lowercaseSentences = sentences.filter(
			(s) =>
				s.length > 3 && s[0] === s[0].toLowerCase() && /[a-zäöü]/.test(s[0]),
		);
		if (lowercaseSentences.length >= 2) {
			reasons.push(
				"Kleinbuchstaben-Stil: Satzanfänge müssen großgeschrieben werden",
			);
		}

		if (message.includes("\u2014") || message.includes("\u2013")) {
			reasons.push("Em-dash/en-dash gefunden (AI-Tell)");
		}

		if (/\s--\s/.test(message)) {
			reasons.push(
				"Gedankenstrich (--) gefunden, keine Gedankenstriche benutzen",
			);
		}

		// Greeting endings are now ALLOWED for first contact (Erstkontakt)
		// Only block overly formal closings
		const tooFormalEndings = ["mit freundlichen grüßen", "hochachtungsvoll"];
		const msgLower = message.toLowerCase().trimEnd();
		const lastChars = msgLower.slice(-60);
		for (const ending of tooFormalEndings) {
			if (lastChars.includes(ending)) {
				reasons.push(`Zu formelle Grußformel: '${ending}'`);
			}
		}

		return reasons;
	}

	private checkPersonalization(
		message: string,
		signals: ListingSignals,
	): string[] {
		const msgLower = message.toLowerCase();

		// Check if any unique feature is mentioned
		for (const feature of signals.uniqueFeatures.slice(0, 5)) {
			const words = feature.split(/\s+/).filter((w) => w.length > 4);
			if (words.some((w) => msgLower.includes(w.toLowerCase()))) return [];
		}

		// Check if price is mentioned
		if (
			signals.price &&
			message.replace(/\./g, "").includes(String(signals.price))
		)
			return [];

		// Check if price in formatted form is mentioned
		if (signals.price) {
			const formatted = signals.price.toLocaleString("de-DE");
			if (message.includes(formatted)) return [];
		}

		// Check if city is mentioned
		if (signals.city && msgLower.includes(signals.city.toLowerCase()))
			return [];

		// Check if PLZ is mentioned
		if (signals.plz && message.includes(signals.plz)) return [];

		// Check if wohnfläche is mentioned
		if (
			signals.wohnflaeche &&
			message.includes(String(Math.round(signals.wohnflaeche)))
		)
			return [];

		// Check if grundstück is mentioned
		if (
			signals.grundstueck &&
			message.includes(String(Math.round(signals.grundstueck)))
		)
			return [];

		return [
			"Keine Personalisierung -- kein spezifisches Detail aus der Anzeige gefunden",
		];
	}

	private checkSelfFocus(message: string): string[] {
		const first50 = message.trim().slice(0, 50).toLowerCase();
		const selfWords = first50.match(
			/\b(ich|mein|mir|mich|meine|meinem|meinen|meiner)\b/g,
		);
		if (selfWords && selfWords.length >= 2) {
			return [
				"Zu viel Ich-Fokus am Anfang -- beginne mit der Immobilie, nicht mit dir",
			];
		}
		return [];
	}

	private checkSellerName(message: string, signals: ListingSignals): string[] {
		if (!signals.sellerName) return [];

		const firstName = signals.sellerName.split(/\s+/)[0];

		if (message.includes(firstName)) {
			return [];
		}

		return [
			`Verkäufername "${firstName}" fehlt. Sprich den Verkäufer mit Namen an.`,
		];
	}

	private async llmQualityCheck(message: string): Promise<number> {
		try {
			const response = await this.llm!.generate(QUALITY_CHECK, message);
			const match = response.trim().match(/\b(\d+)\b/);
			if (match) {
				const score = Number.parseInt(match[1]);
				return Math.max(1, Math.min(10, score));
			}
			return 5;
		} catch {
			return 5;
		}
	}
}
