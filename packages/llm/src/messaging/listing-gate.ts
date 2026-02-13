import { LISTING_GATE } from "@scraper/agent";
import type { LLMClient } from "./message-generator";
import type { CompanyCriteria, GateResult, ListingSignals } from "./models";

export class ListingGate {
	private llm?: LLMClient;

	constructor(llmClient?: LLMClient) {
		this.llm = llmClient;
	}

	async check(
		signals: ListingSignals,
		criteria?: CompanyCriteria,
	): Promise<GateResult> {
		if (criteria) {
			const criteriaResult = this.checkCriteria(signals, criteria);
			if (!criteriaResult.passed) return criteriaResult;
		}

		if (this.llm) {
			const llmResult = await this.checkLLM(signals, criteria);
			if (!llmResult.passed) return llmResult;
		}

		return {
			passed: true,
			rejectionType: null,
			rejectionReason: null,
			details: [],
		};
	}

	private checkCriteria(
		signals: ListingSignals,
		criteria: CompanyCriteria,
	): GateResult {
		const mismatches: string[] = [];

		if (signals.price > 0) {
			if (
				criteria.minPrice !== undefined &&
				signals.price < criteria.minPrice
			) {
				mismatches.push(
					`Preis ${signals.price}€ unter Minimum ${criteria.minPrice}€`,
				);
			}
			if (
				criteria.maxPrice !== undefined &&
				signals.price > criteria.maxPrice
			) {
				mismatches.push(
					`Preis ${signals.price}€ über Maximum ${criteria.maxPrice}€`,
				);
			}
		}

		if (mismatches.length > 0) {
			return {
				passed: false,
				rejectionType: "criteria_mismatch",
				rejectionReason: `Inserat passt nicht zu Kriterien: ${mismatches[0]}`,
				details: mismatches,
			};
		}

		return {
			passed: true,
			rejectionType: null,
			rejectionReason: null,
			details: [],
		};
	}

	private async checkLLM(
		signals: ListingSignals,
		criteria?: CompanyCriteria,
	): Promise<GateResult> {
		try {
			const context = this.buildLLMContext(signals, criteria);
			const response = await this.llm!.generate(LISTING_GATE, context);
			const firstLine = response.trim().split("\n")[0].trim().toUpperCase();

			if (firstLine === "JA" || firstLine.startsWith("JA")) {
				return {
					passed: true,
					rejectionType: null,
					rejectionReason: null,
					details: [],
				};
			}

			const lines = response.trim().split("\n");
			const reason =
				lines.length > 1 ? lines[1].trim() : "LLM-Gate: Inserat nicht geeignet";

			return {
				passed: false,
				rejectionType: "llm_rejection",
				rejectionReason: reason,
				details: [reason],
			};
		} catch {
			// Bei LLM-Fehler lieber durchlassen als fälschlich blockieren
			return {
				passed: true,
				rejectionType: null,
				rejectionReason: null,
				details: [],
			};
		}
	}

	private buildLLMContext(
		signals: ListingSignals,
		criteria?: CompanyCriteria,
	): string {
		const parts: string[] = [];

		parts.push("=== INSERAT ===");
		parts.push(signals.rawText.slice(0, 2000));

		parts.push("\n=== FIRMEN-KRITERIEN ===");
		if (criteria) {
			const range = [
				criteria.minPrice
					? `ab ${criteria.minPrice.toLocaleString("de-DE")}€`
					: null,
				criteria.maxPrice
					? `bis ${criteria.maxPrice.toLocaleString("de-DE")}€`
					: null,
			].filter(Boolean);
			if (range.length) {
				parts.push(`Preisbereich: ${range.join(" ")}`);
			}
		} else {
			parts.push("Keine spezifischen Kriterien hinterlegt.");
		}

		parts.push("\n=== EXTRAHIERTE DATEN ===");
		if (signals.propertyType)
			parts.push(`Erkannter Typ: ${signals.propertyType}`);
		if (signals.price) parts.push(`Erkannter Preis: ${signals.price}€`);
		if (signals.city) parts.push(`Erkannte Stadt: ${signals.city}`);
		if (signals.zipCode) parts.push(`PLZ: ${signals.zipCode}`);

		return parts.join("\n");
	}
}
