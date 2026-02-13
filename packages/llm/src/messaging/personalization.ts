import { ListingAnalyzer } from "./listing-analyzer";
import {
	type ListingSignals,
	type PersonalizationResult,
	DescriptionEffort,
	MessageVariant,
	PriceAssessment,
	SellerEmotion,
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
		const recommendedVariants = this.rankVariants(signals);

		return {
			primaryAnchor,
			secondaryAnchors,
			tone: signals.tone,
			recommendedVariants,
			priceInsight,
			emotionalHook,
		};
	}

	private selectPrimaryAnchor(s: ListingSignals): string {
		// 1. Unique features — pick the most specific one
		if (s.uniqueFeatures.length > 0) {
			const ranked = [...s.uniqueFeatures].sort((a, b) => b.length - a.length);
			return ranked[0];
		}

		// 2. Renovation history
		if (s.renovationHistory) return s.renovationHistory;

		// 3. Lifestyle signals combined with location
		if (s.lifestyleSignals.length > 0 && s.locationQualityHints.length > 0) {
			return `${s.locationQualityHints[0]} — ${s.lifestyleSignals.slice(0, 2).join(", ")}`;
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
			return `${Math.round(s.pricePerSqm)}€/m² — deutlich unter dem regionalen Durchschnitt von ~${Math.round(marketAvg)}€/m²`;
		}
		if (diffPct < -10) {
			return `${Math.round(s.pricePerSqm)}€/m² — unter dem regionalen Durchschnitt von ~${Math.round(marketAvg)}€/m²`;
		}
		if (diffPct > 25) {
			return `${Math.round(s.pricePerSqm)}€/m² — über dem regionalen Durchschnitt von ~${Math.round(marketAvg)}€/m²`;
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

		return parts.length > 0 ? parts.join(" — ") : null;
	}

	private rankVariants(s: ListingSignals): MessageVariant[] {
		const scores = new Map<MessageVariant, number>();
		for (const v of Object.values(MessageVariant)) {
			scores.set(v as MessageVariant, 0);
		}

		// A: Specific Observer — needs unique features
		scores.set(
			MessageVariant.SPECIFIC_OBSERVER,
			(scores.get(MessageVariant.SPECIFIC_OBSERVER) ?? 0) +
				s.uniqueFeatures.length * 2.0,
		);
		if (s.descriptionEffort === DescriptionEffort.HIGH) {
			scores.set(
				MessageVariant.SPECIFIC_OBSERVER,
				(scores.get(MessageVariant.SPECIFIC_OBSERVER) ?? 0) + 1.0,
			);
		}

		// B: Market Insider — needs price data
		if (s.priceAssessment === PriceAssessment.BELOW_MARKET) {
			scores.set(
				MessageVariant.MARKET_INSIDER,
				(scores.get(MessageVariant.MARKET_INSIDER) ?? 0) + 4.0,
			);
		} else if (s.priceAssessment === PriceAssessment.ABOVE_MARKET) {
			scores.set(
				MessageVariant.MARKET_INSIDER,
				(scores.get(MessageVariant.MARKET_INSIDER) ?? 0) + 2.0,
			);
		}
		if (s.pricePerSqm > 0) {
			scores.set(
				MessageVariant.MARKET_INSIDER,
				(scores.get(MessageVariant.MARKET_INSIDER) ?? 0) + 1.0,
			);
		}

		// C: Empathetic Peer — works best with proud/detailed sellers
		if (s.sellerEmotion === SellerEmotion.PROUD) {
			scores.set(
				MessageVariant.EMPATHETIC_PEER,
				(scores.get(MessageVariant.EMPATHETIC_PEER) ?? 0) + 3.0,
			);
		}
		if (s.descriptionEffort === DescriptionEffort.HIGH) {
			scores.set(
				MessageVariant.EMPATHETIC_PEER,
				(scores.get(MessageVariant.EMPATHETIC_PEER) ?? 0) + 2.0,
			);
		}
		if (s.isVb) {
			scores.set(
				MessageVariant.EMPATHETIC_PEER,
				(scores.get(MessageVariant.EMPATHETIC_PEER) ?? 0) + 1.0,
			);
		}

		// D: Curious Neighbor — needs location signals
		scores.set(
			MessageVariant.CURIOUS_NEIGHBOR,
			(scores.get(MessageVariant.CURIOUS_NEIGHBOR) ?? 0) +
				s.locationQualityHints.length * 1.5,
		);
		if (s.lifestyleSignals.length > 0) {
			scores.set(
				MessageVariant.CURIOUS_NEIGHBOR,
				(scores.get(MessageVariant.CURIOUS_NEIGHBOR) ?? 0) + 1.0,
			);
		}
		if (s.grundstueck > 500) {
			scores.set(
				MessageVariant.CURIOUS_NEIGHBOR,
				(scores.get(MessageVariant.CURIOUS_NEIGHBOR) ?? 0) + 1.0,
			);
		}

		// E: Quiet Expert — universal fallback, always viable
		scores.set(
			MessageVariant.QUIET_EXPERT,
			(scores.get(MessageVariant.QUIET_EXPERT) ?? 0) + 2.0,
		);
		if (s.isVb) {
			scores.set(
				MessageVariant.QUIET_EXPERT,
				(scores.get(MessageVariant.QUIET_EXPERT) ?? 0) + 1.0,
			);
		}
		if (s.price > 0 && s.wohnflaeche > 0) {
			scores.set(
				MessageVariant.QUIET_EXPERT,
				(scores.get(MessageVariant.QUIET_EXPERT) ?? 0) + 1.0,
			);
		}

		// F: Value Spotter — needs hidden potential
		const hiddenValueKeywords = [
			"einliegerwohnung",
			"teilbar",
			"ausbau",
			"dachgeschoss",
			"umbau",
			"potenzial",
			"möglich",
			"separater eingang",
		];
		const textLower = s.rawText.toLowerCase();
		for (const kw of hiddenValueKeywords) {
			if (textLower.includes(kw)) {
				scores.set(
					MessageVariant.VALUE_SPOTTER,
					(scores.get(MessageVariant.VALUE_SPOTTER) ?? 0) + 2.0,
				);
			}
		}
		if (s.grundstueck > 0 && s.grundstueck > s.wohnflaeche * 3) {
			scores.set(
				MessageVariant.VALUE_SPOTTER,
				(scores.get(MessageVariant.VALUE_SPOTTER) ?? 0) + 1.5,
			);
		}

		// Sort by score descending
		return [...scores.entries()]
			.sort((a, b) => b[1] - a[1])
			.map(([variant]) => variant);
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
