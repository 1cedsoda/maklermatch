import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
	FORMAL_MARKERS,
	INFORMAL_MARKERS,
	LIFESTYLE_KEYWORDS,
	RENOVATION_KEYWORDS,
	UNIQUE_FEATURE_KEYWORDS,
	URGENCY_KEYWORDS,
} from "./config";
import {
	type ListingSignals,
	DescriptionEffort,
	PriceAssessment,
	SellerEmotion,
	Tone,
	createListingSignals,
} from "./models";

// Load market prices once at import time
const __dirname =
	typeof import.meta.dir === "string"
		? import.meta.dir
		: dirname(fileURLToPath(import.meta.url));
const MARKET_PRICES_PATH = join(
	__dirname,
	"..",
	"..",
	"data",
	"market_prices.json",
);
let MARKET_PRICES: Record<string, Record<string, number | string>> = {};
try {
	MARKET_PRICES = JSON.parse(readFileSync(MARKET_PRICES_PATH, "utf-8"));
} catch {
	// Market prices file not found — price assessment will return UNKNOWN
}

export class ListingAnalyzer {
	analyze(rawText: string, listingId = "", listingUrl = ""): ListingSignals {
		const s = createListingSignals(rawText, listingId, listingUrl);

		this.extractTitle(s);
		this.extractPrice(s);
		this.extractPropertyDetails(s);
		this.extractLocation(s);
		this.extractFeatures(s);
		this.extractRenovation(s);
		this.extractLifestyle(s);
		this.extractAmenities(s);
		this.assessPrice(s);
		this.detectSellerPsychology(s);
		this.detectTone(s);

		return s;
	}

	private extractTitle(s: ListingSignals): void {
		const lines = s.rawText.trim().split("\n");
		if (lines.length > 0) {
			s.title = lines[0].trim();
			const textLower = s.rawText.toLowerCase();
			if (
				[
					"haus",
					"einfamilienhaus",
					"doppelhaushälfte",
					"reihenhaus",
					"bungalow",
					"villa",
				].some((w) => textLower.includes(w))
			) {
				s.propertyType = "Haus";
			} else if (
				[
					"wohnung",
					"eigentumswohnung",
					"apartment",
					"penthouse",
					"maisonette",
				].some((w) => textLower.includes(w))
			) {
				s.propertyType = "Wohnung";
			} else if (
				["grundstück", "baugrundstück", "bauland"].some((w) =>
					textLower.includes(w),
				)
			) {
				s.propertyType = "Grundstück";
			} else if (textLower.includes("mehrfamilienhaus")) {
				s.propertyType = "Mehrfamilienhaus";
			} else {
				s.propertyType = "Immobilie";
			}
		}
	}

	private extractPrice(s: ListingSignals): void {
		const priceMatch = s.rawText.match(
			/(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)\s*(?:€|EUR)/,
		);
		if (priceMatch) {
			const priceStr = priceMatch[1].replace(/\./g, "").replace(",", ".");
			s.price = Math.round(Number.parseFloat(priceStr));
		}

		s.isVb = /\bVB\b|Verhandlungsbasis/i.test(s.rawText);

		const provisionLower = s.rawText.toLowerCase();
		if (
			provisionLower.includes("keine") &&
			provisionLower.includes("provision")
		) {
			s.provision = "keine";
			s.hasProvisionNote = true;
		} else if (
			provisionLower.includes("provision") ||
			provisionLower.includes("courtage")
		) {
			s.hasProvisionNote = true;
			s.provision = "vorhanden";
		}
	}

	private extractPropertyDetails(s: ListingSignals): void {
		const text = s.rawText;

		const wfMatch = text.match(
			/(?:Wohnfläche|Wohnfl)\s*[\n:]*\s*(\d+(?:[,.]\d+)?)\s*m/i,
		);
		if (wfMatch)
			s.wohnflaeche = Number.parseFloat(wfMatch[1].replace(",", "."));

		const gfMatch = text.match(
			/(?:Grundstücks?fläche|Grundst)\s*[\n:]*\s*(\d+(?:[,.]\d+)?)\s*m/i,
		);
		if (gfMatch)
			s.grundstueck = Number.parseFloat(gfMatch[1].replace(",", "."));

		const ziMatch = text.match(/Zimmer\s*[\n:]*\s*(\d+(?:[,.]\d+)?)/i);
		if (ziMatch)
			s.zimmer = Math.round(Number.parseFloat(ziMatch[1].replace(",", ".")));

		const bjMatch = text.match(/Baujahr\s*[\n:]*\s*(\d{4})/i);
		if (bjMatch) s.baujahr = Number.parseInt(bjMatch[1]);

		const etMatch = text.match(/Etagen\s*[\n:]*\s*(\d+)/i);
		if (etMatch) s.etagen = Number.parseInt(etMatch[1]);

		if (s.price > 0 && s.wohnflaeche > 0) {
			s.pricePerSqm = Math.round(s.price / s.wohnflaeche);
		}
	}

	private extractLocation(s: ListingSignals): void {
		const locMatch = s.rawText.match(
			/(\d{5})\s+(\S+(?:\s+\S+)*?)\s*[-–]\s*(.+?)(?:\n|$)/,
		);
		if (locMatch) {
			s.plz = locMatch[1];
			s.bundesland = locMatch[2].trim();
			s.city = locMatch[3].trim();
		} else {
			const plzMatch = s.rawText.match(/\b(\d{5})\b/);
			if (plzMatch) s.plz = plzMatch[1];
		}

		const textLower = s.rawText.toLowerCase();
		const hintPatterns: [RegExp, string][] = [
			[/am\s+wald|im\s+wald|waldrand|waldnähe/, "Waldnähe"],
			[/ruhige\s+(?:lage|straße|gegend|nachbarschaft)/, "ruhige Lage"],
			[/zentral|innenstadt|stadtmitte|stadtzentrum/, "zentrale Lage"],
			[/am\s+see|seenähe|seeblick/, "Seenähe"],
			[/am\s+fluss|flussnähe/, "Flussnähe"],
			[/am\s+park|parknähe/, "Parknähe"],
			[/aussicht|ausblick|panorama|fernblick/, "Aussichtslage"],
			[/sonnig|südlage|süd-?west/, "Sonnenlage"],
		];
		for (const [pattern, label] of hintPatterns) {
			if (pattern.test(textLower)) {
				s.locationQualityHints.push(label);
			}
		}
	}

	private extractFeatures(s: ListingSignals): void {
		const text = s.rawText;
		const seenContexts = new Set<string>();

		for (const keyword of UNIQUE_FEATURE_KEYWORDS) {
			if (text.toLowerCase().includes(keyword.toLowerCase())) {
				const pattern = new RegExp(
					`[^.\\n]*${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^.\\n]*`,
					"i",
				);
				const match = text.match(pattern);
				if (match) {
					let featureContext = match[0].trim().replace(/^[-•–]\s*/, "");
					if (seenContexts.has(featureContext)) continue;
					seenContexts.add(featureContext);
					if (featureContext.length < 120) {
						s.uniqueFeatures.push(featureContext);
					} else {
						s.uniqueFeatures.push(keyword);
					}
				} else {
					if (!seenContexts.has(keyword)) {
						seenContexts.add(keyword);
						s.uniqueFeatures.push(keyword);
					}
				}
			}
		}
	}

	private extractRenovation(s: ListingSignals): void {
		const text = s.rawText;
		for (const keyword of RENOVATION_KEYWORDS) {
			if (text.toLowerCase().includes(keyword.toLowerCase())) {
				for (const line of text.split("\n")) {
					if (line.toLowerCase().includes(keyword.toLowerCase())) {
						const cleaned = line.trim().replace(/^[-•–]\s*/, "");
						if (cleaned) {
							s.renovationHistory = cleaned;
							return;
						}
					}
				}
			}
		}
	}

	private extractLifestyle(s: ListingSignals): void {
		const textLower = s.rawText.toLowerCase();
		for (const keyword of LIFESTYLE_KEYWORDS) {
			if (textLower.includes(keyword.toLowerCase())) {
				s.lifestyleSignals.push(keyword);
			}
		}
	}

	private extractAmenities(s: ListingSignals): void {
		const amenityKeywords = [
			"Terrasse",
			"Badewanne",
			"Gäste-WC",
			"Keller",
			"Dachboden",
			"Garage",
			"Stellplatz",
			"Garten",
			"Balkon",
			"Aufzug",
			"Einbauküche",
			"Fußbodenheizung",
			"Klimaanlage",
		];
		const text = s.rawText;
		for (const kw of amenityKeywords) {
			if (text.toLowerCase().includes(kw.toLowerCase())) {
				s.amenities.push(kw);
			}
		}

		const infraKeywords = [
			"Glasfaser",
			"Schule",
			"Kita",
			"Kindergarten",
			"Einkauf",
			"ÖPNV",
			"Bushaltestelle",
			"Straßenbahn",
			"U-Bahn",
			"S-Bahn",
		];
		for (const kw of infraKeywords) {
			if (text.toLowerCase().includes(kw.toLowerCase())) {
				s.infrastructure.push(kw);
			}
		}
	}

	private assessPrice(s: ListingSignals): void {
		if (s.pricePerSqm <= 0 || !s.plz) {
			s.priceAssessment = PriceAssessment.UNKNOWN;
			return;
		}

		const plzPrefix = s.plz.slice(0, 2);
		const propertyKey =
			s.propertyType === "Haus" || s.propertyType === "Mehrfamilienhaus"
				? "haus"
				: "wohnung";

		const regionalAvg = Number(MARKET_PRICES[plzPrefix]?.[propertyKey] ?? 0);
		if (regionalAvg <= 0) {
			s.priceAssessment = PriceAssessment.UNKNOWN;
			return;
		}

		const ratio = s.pricePerSqm / regionalAvg;
		if (ratio < 0.75) {
			s.priceAssessment = PriceAssessment.BELOW_MARKET;
		} else if (ratio > 1.25) {
			s.priceAssessment = PriceAssessment.ABOVE_MARKET;
		} else {
			s.priceAssessment = PriceAssessment.AT_MARKET;
		}
	}

	private detectSellerPsychology(s: ListingSignals): void {
		const textLower = s.rawText.toLowerCase();

		const descMatch = s.rawText.match(
			/Beschreibung\s*\n([\s\S]+?)(?:\n(?:Standort|Anbieter|$))/,
		);
		const descSection = descMatch ? descMatch[1] : s.rawText;

		const wordCount = descSection.split(/\s+/).length;
		if (wordCount > 150) {
			s.descriptionEffort = DescriptionEffort.HIGH;
		} else if (wordCount > 50) {
			s.descriptionEffort = DescriptionEffort.MEDIUM;
		} else {
			s.descriptionEffort = DescriptionEffort.LOW;
		}

		for (const kw of URGENCY_KEYWORDS) {
			if (textLower.includes(kw.toLowerCase())) {
				s.sellerEmotion = SellerEmotion.URGENT;
				return;
			}
		}

		const emotionalWords = [
			"herzblut",
			"liebe",
			"traum",
			"paradies",
			"schmuckstück",
			"perle",
			"juwel",
			"besonders",
		];
		if (
			s.descriptionEffort === DescriptionEffort.HIGH ||
			emotionalWords.some((w) => textLower.includes(w))
		) {
			s.sellerEmotion = SellerEmotion.PROUD;
			return;
		}

		s.sellerEmotion = SellerEmotion.NEUTRAL;
	}

	private detectTone(s: ListingSignals): void {
		const textLower = s.rawText.toLowerCase();

		let informalCount = INFORMAL_MARKERS.filter((m) =>
			textLower.includes(m.toLowerCase()),
		).length;
		let formalCount = FORMAL_MARKERS.filter((m) =>
			textLower.includes(m.toLowerCase()),
		).length;

		if (
			/\b(du|dir|dich|dein|deine|deinem|deinen|deiner|euch|euer|eure)\b/.test(
				textLower,
			)
		) {
			informalCount += 3;
		}

		if (/\b(Ihnen|Ihrem|Ihren|Ihrer)\b/.test(s.rawText)) {
			formalCount += 3;
		}

		if (s.rawText.includes("...") || (s.rawText.match(/!/g) ?? []).length > 2) {
			informalCount += 1;
		}

		s.tone = informalCount > formalCount ? Tone.DU : Tone.SIE;
	}

	getMarketPrice(plz: string, propertyType = "haus"): number {
		const plzPrefix = plz.length >= 2 ? plz.slice(0, 2) : "";
		const propertyKey =
			propertyType === "Haus" || propertyType === "Mehrfamilienhaus"
				? "haus"
				: "wohnung";
		return Number(MARKET_PRICES[plzPrefix]?.[propertyKey] ?? 0);
	}
}
