import { LISTING_GATE } from "@scraper/agent";
import type { LLMClient } from "./message-generator";
import type { BrokerCriteria, GateResult, ListingSignals } from "./models";

export class ListingGate {
	private llm?: LLMClient;

	constructor(llmClient?: LLMClient) {
		this.llm = llmClient;
	}

	async check(
		signals: ListingSignals,
		criteria?: BrokerCriteria,
	): Promise<GateResult> {
		if (criteria) {
			const criteriaResult = this.checkKriterien(signals, criteria);
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

	private checkKriterien(
		signals: ListingSignals,
		criteria: BrokerCriteria,
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

		if (
			criteria.propertyTypes &&
			criteria.propertyTypes.length > 0 &&
			signals.propertyType
		) {
			const typesLower = criteria.propertyTypes.map((t) => t.toLowerCase());
			if (!typesLower.includes(signals.propertyType.toLowerCase())) {
				mismatches.push(
					`Immobilientyp "${signals.propertyType}" nicht in [${criteria.propertyTypes.join(", ")}]`,
				);
			}
		}

		if (
			criteria.plzPrefixes &&
			criteria.plzPrefixes.length > 0 &&
			signals.plz
		) {
			const matchesPLZ = criteria.plzPrefixes.some((prefix) =>
				signals.plz.startsWith(prefix),
			);
			if (!matchesPLZ) {
				mismatches.push(
					`PLZ ${signals.plz} nicht in Regionen [${criteria.plzPrefixes.join(", ")}]`,
				);
			}
		}

		if (criteria.cities && criteria.cities.length > 0 && signals.city) {
			const citiesLower = criteria.cities.map((c) => c.toLowerCase());
			const cityLower = signals.city.toLowerCase();
			const match = citiesLower.some(
				(c) => cityLower.includes(c) || c.includes(cityLower),
			);
			if (!match) {
				mismatches.push(
					`Stadt "${signals.city}" nicht in [${criteria.cities.join(", ")}]`,
				);
			}
		}

		if (
			criteria.bundeslaender &&
			criteria.bundeslaender.length > 0 &&
			signals.bundesland
		) {
			const blLower = criteria.bundeslaender.map((b) => b.toLowerCase());
			if (!blLower.includes(signals.bundesland.toLowerCase())) {
				mismatches.push(
					`Bundesland "${signals.bundesland}" nicht in [${criteria.bundeslaender.join(", ")}]`,
				);
			}
		}

		if (signals.wohnflaeche > 0) {
			if (
				criteria.minWohnflaeche !== undefined &&
				signals.wohnflaeche < criteria.minWohnflaeche
			) {
				mismatches.push(
					`Wohnfläche ${signals.wohnflaeche}m² unter Minimum ${criteria.minWohnflaeche}m²`,
				);
			}
			if (
				criteria.maxWohnflaeche !== undefined &&
				signals.wohnflaeche > criteria.maxWohnflaeche
			) {
				mismatches.push(
					`Wohnfläche ${signals.wohnflaeche}m² über Maximum ${criteria.maxWohnflaeche}m²`,
				);
			}
		}

		if (
			criteria.minZimmer !== undefined &&
			signals.zimmer > 0 &&
			signals.zimmer < criteria.minZimmer
		) {
			mismatches.push(
				`${signals.zimmer} Zimmer unter Minimum ${criteria.minZimmer}`,
			);
		}

		if (mismatches.length > 0) {
			return {
				passed: false,
				rejectionType: "kriterien_mismatch",
				rejectionReason: `Inserat passt nicht zu Makler-Kriterien: ${mismatches[0]}`,
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
		criteria?: BrokerCriteria,
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
		criteria?: BrokerCriteria,
	): string {
		const parts: string[] = [];

		parts.push("=== INSERAT ===");
		parts.push(signals.rawText.slice(0, 2000));

		parts.push("\n=== MAKLER-PROFIL ===");
		if (criteria) {
			if (criteria.propertyTypes?.length)
				parts.push(`Immobilientypen: ${criteria.propertyTypes.join(", ")}`);
			if (criteria.cities?.length)
				parts.push(`Städte: ${criteria.cities.join(", ")}`);
			if (criteria.bundeslaender?.length)
				parts.push(`Bundesländer: ${criteria.bundeslaender.join(", ")}`);
			if (criteria.plzPrefixes?.length)
				parts.push(`PLZ-Bereiche: ${criteria.plzPrefixes.join(", ")}`);
			if (criteria.minPrice !== undefined || criteria.maxPrice !== undefined) {
				const min = criteria.minPrice?.toLocaleString("de-DE") ?? "–";
				const max = criteria.maxPrice?.toLocaleString("de-DE") ?? "–";
				parts.push(`Preisbereich: ${min}€ – ${max}€`);
			}
		} else {
			parts.push("Keine spezifischen Kriterien hinterlegt.");
		}

		parts.push("\n=== EXTRAHIERTE DATEN ===");
		if (signals.propertyType)
			parts.push(`Erkannter Typ: ${signals.propertyType}`);
		if (signals.price) parts.push(`Erkannter Preis: ${signals.price}€`);
		if (signals.city) parts.push(`Erkannte Stadt: ${signals.city}`);
		if (signals.plz) parts.push(`PLZ: ${signals.plz}`);

		return parts.join("\n");
	}
}
