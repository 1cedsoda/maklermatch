import { ListingAnalyzer } from "./listing-analyzer";
import {
	type ListingSignals,
	type PersonalizationResult,
	PriceAssessment,
} from "./models";

export class PersonalizationEngine {
	personalize(signals: ListingSignals): PersonalizationResult {
		const primaryAnchor = this.selectPrimaryAnchor(signals);
		const secondaryAnchors = this.selectSecondaryAnchors(
			signals,
			primaryAnchor,
		);
		const priceInsight = this.buildPriceInsight(signals);
		const emotionalHook = this.buildEmotionalHook(signals);

		return {
			primaryAnchor,
			secondaryAnchors,
			tone: signals.tone,
			priceInsight,
			emotionalHook,
		};
	}

	private selectPrimaryAnchor(s: ListingSignals): string {
		// 1. Unique features -- pick the most specific one
		if (s.uniqueFeatures.length > 0) {
			const ranked = [...s.uniqueFeatures].sort((a, b) => b.length - a.length);
			return ranked[0];
		}

		// 2. Renovation history
		if (s.renovationHistory) return s.renovationHistory;

		// 3. Lifestyle signals combined with location
		if (s.lifestyleSignals.length > 0 && s.locationQualityHints.length > 0) {
			return `${s.locationQualityHints[0]} -- ${s.lifestyleSignals.slice(0, 2).join(", ")}`;
		}

		// 4. Price discrepancy
		if (
			s.priceAssessment === PriceAssessment.BELOW_MARKET &&
			s.pricePerSqm > 0
		) {
			return `${Math.round(s.pricePerSqm)}€/m² in ${s.city || s.plz}`;
		}

		// 5. Location quality
		if (s.locationQualityHints.length > 0) return s.locationQualityHints[0];

		// 6. Fallback: combine basic facts
		const parts: string[] = [];
		if (s.wohnflaeche) parts.push(`${Math.round(s.wohnflaeche)}m²`);
		if (s.propertyType) parts.push(s.propertyType);
		if (s.city) parts.push(`in ${s.city}`);
		return parts.length > 0 ? parts.join(" ") : s.title;
	}

	private selectSecondaryAnchors(s: ListingSignals, primary: string): string[] {
		const candidates: string[] = [];

		for (const feature of s.uniqueFeatures) {
			if (feature !== primary) candidates.push(feature);
		}

		if (s.renovationHistory && s.renovationHistory !== primary) {
			candidates.push(s.renovationHistory);
		}

		for (const hint of s.locationQualityHints) {
			if (hint !== primary && !candidates.includes(hint)) {
				candidates.push(hint);
			}
		}

		if (s.grundstueck > 0) {
			candidates.push(`${Math.round(s.grundstueck)}m² Grundstück`);
		}

		if (s.lifestyleSignals.length > 0) {
			const combined = s.lifestyleSignals.slice(0, 3).join(", ");
			if (combined !== primary) candidates.push(combined);
		}

		return candidates.slice(0, 3);
	}

	private buildPriceInsight(s: ListingSignals): string | null {
		if (s.pricePerSqm <= 0) return null;

		const analyzer = new ListingAnalyzer();
		const marketAvg = analyzer.getMarketPrice(s.plz, s.propertyType);

		if (marketAvg <= 0) return `${Math.round(s.pricePerSqm)}€/m²`;

		const diffPct = ((s.pricePerSqm - marketAvg) / marketAvg) * 100;

		if (diffPct < -25) {
			return `${Math.round(s.pricePerSqm)}€/m² -- deutlich unter dem regionalen Durchschnitt von ~${Math.round(marketAvg)}€/m²`;
		}
		if (diffPct < -10) {
			return `${Math.round(s.pricePerSqm)}€/m² -- unter dem regionalen Durchschnitt von ~${Math.round(marketAvg)}€/m²`;
		}
		if (diffPct > 25) {
			return `${Math.round(s.pricePerSqm)}€/m² -- über dem regionalen Durchschnitt von ~${Math.round(marketAvg)}€/m²`;
		}
		return `${Math.round(s.pricePerSqm)}€/m² (Marktschnitt: ~${Math.round(marketAvg)}€/m²)`;
	}

	private buildEmotionalHook(s: ListingSignals): string | null {
		const parts: string[] = [];

		if (
			s.title &&
			["familie", "traum", "paradies", "idylle"].some((w) =>
				s.title.toLowerCase().includes(w),
			)
		) {
			parts.push(s.title);
		}

		if (
			s.locationQualityHints.includes("Waldnähe") ||
			s.locationQualityHints.includes("Wald")
		) {
			parts.push("am Wald");
		} else if (s.locationQualityHints.includes("ruhige Lage")) {
			parts.push("ruhige Lage");
		}

		if (
			s.lifestyleSignals.includes("Familie") ||
			s.lifestyleSignals.includes("Kinder")
		) {
			parts.push("Familienhaus");
		}

		return parts.length > 0 ? parts.join(" -- ") : null;
	}

	getPersonalizationDepth(
		signals: ListingSignals,
	): "deep" | "medium" | "shallow" {
		const anchorCount =
			signals.uniqueFeatures.length +
			(signals.renovationHistory ? 1 : 0) +
			signals.locationQualityHints.length +
			(signals.priceAssessment !== PriceAssessment.UNKNOWN ? 1 : 0);

		if (anchorCount >= 5) return "deep";
		if (anchorCount >= 2) return "medium";
		return "shallow";
	}
}
