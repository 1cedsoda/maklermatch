import { SENTIMENT } from "@scraper/agent";
import { ReplySentiment } from "./models";
import type { LLMClient } from "./message-generator";

const NEGATIVE_AGGRESSIVE_KEYWORDS = [
	"spam",
	"melden",
	"anzeige",
	"gemeldet",
	"nerv",
	"lass mich in ruhe",
	"hör auf",
	"blockiert",
	"blockiere",
	"belästigung",
	"abmahnung",
	"anwalt",
	"polizei",
	"strafanzeige",
	"unverschämt",
];
const NEGATIVE_POLITE_KEYWORDS = [
	"kein interesse",
	"nein danke",
	"nicht interessiert",
	"brauche keinen",
	"brauche keine",
	"bereits verkauft",
	"schon verkauft",
	"bitte keine",
	"keine weiteren",
];
const POSITIVE_KEYWORDS = [
	"danke",
	"interessant",
	"gute frage",
	"stimmt",
	"ja,",
	"erzähl",
	"erzählen sie",
	"gerne",
	"klar",
	"genau",
];

export class OutcomeTracker {
	private llm: LLMClient | null;

	constructor(llmClient: LLMClient | null = null) {
		this.llm = llmClient;
	}

	async classifyReply(replyText: string): Promise<ReplySentiment> {
		if (this.llm) return this.classifyWithLlm(replyText);
		return this.classifyWithKeywords(replyText);
	}

	private async classifyWithLlm(replyText: string): Promise<ReplySentiment> {
		try {
			const response = (await this.llm!.generate(SENTIMENT, replyText))
				.trim()
				.toLowerCase();

			const mapping: Record<string, ReplySentiment> = {
				positiv_offen: ReplySentiment.POSITIVE_OPEN,
				positiv_kurz: ReplySentiment.POSITIVE_SHORT,
				neutral: ReplySentiment.NEUTRAL,
				negativ_ablehnend: ReplySentiment.NEGATIVE_POLITE,
				negativ_aggressiv: ReplySentiment.NEGATIVE_AGGRESSIVE,
			};

			for (const [key, sentiment] of Object.entries(mapping)) {
				if (response.includes(key)) return sentiment;
			}

			return this.classifyWithKeywords(replyText);
		} catch {
			return this.classifyWithKeywords(replyText);
		}
	}

	private classifyWithKeywords(replyText: string): ReplySentiment {
		const textLower = replyText.toLowerCase();

		for (const kw of NEGATIVE_AGGRESSIVE_KEYWORDS) {
			if (textLower.includes(kw)) return ReplySentiment.NEGATIVE_AGGRESSIVE;
		}

		for (const kw of NEGATIVE_POLITE_KEYWORDS) {
			if (textLower.includes(kw)) return ReplySentiment.NEGATIVE_POLITE;
		}

		for (const kw of POSITIVE_KEYWORDS) {
			if (textLower.includes(kw)) {
				return replyText.split(/\s+/).length < 10
					? ReplySentiment.POSITIVE_SHORT
					: ReplySentiment.POSITIVE_OPEN;
			}
		}

		return ReplySentiment.NEUTRAL;
	}

	isPositive(sentiment: ReplySentiment): boolean {
		return (
			sentiment === ReplySentiment.POSITIVE_OPEN ||
			sentiment === ReplySentiment.POSITIVE_SHORT
		);
	}

	isNegative(sentiment: ReplySentiment): boolean {
		return (
			sentiment === ReplySentiment.NEGATIVE_POLITE ||
			sentiment === ReplySentiment.NEGATIVE_AGGRESSIVE
		);
	}

	shouldContinueOutreach(sentiment: ReplySentiment): boolean {
		return !this.isNegative(sentiment);
	}
}
