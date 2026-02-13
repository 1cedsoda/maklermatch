import { describe, expect, test } from "bun:test";
import { ListingGate } from "../listing-gate";
import type { BrokerCriteria } from "../models";
import { createListingSignals } from "../models";

// Ohne LLMClient → nur Kriterien-Check (kein LLM)
const gate = new ListingGate();

function signals(overrides: {
	rawText?: string;
	price?: number;
	propertyType?: string;
	plz?: string;
	city?: string;
	bundesland?: string;
	wohnflaeche?: number;
	zimmer?: number;
}) {
	const s = createListingSignals(overrides.rawText ?? "Test listing");
	if (overrides.price !== undefined) s.price = overrides.price;
	if (overrides.propertyType) s.propertyType = overrides.propertyType;
	if (overrides.plz) s.plz = overrides.plz;
	if (overrides.city) s.city = overrides.city;
	if (overrides.bundesland) s.bundesland = overrides.bundesland;
	if (overrides.wohnflaeche !== undefined)
		s.wohnflaeche = overrides.wohnflaeche;
	if (overrides.zimmer !== undefined) s.zimmer = overrides.zimmer;
	return s;
}

describe("ListingGate", () => {
	describe("Kriterien-Abgleich", () => {
		const criteria: BrokerCriteria = {
			minPrice: 200_000,
			maxPrice: 1_000_000,
			propertyTypes: ["Haus", "Wohnung"],
			plzPrefixes: ["79"],
			cities: ["Freiburg"],
			minWohnflaeche: 50,
			minZimmer: 3,
		};

		test("passes when listing matches all criteria", async () => {
			const result = await gate.check(
				signals({
					price: 500_000,
					propertyType: "Haus",
					plz: "79111",
					city: "Freiburg",
					wohnflaeche: 120,
					zimmer: 5,
				}),
				criteria,
			);
			expect(result.passed).toBe(true);
		});

		test("rejects when price too low", async () => {
			const result = await gate.check(
				signals({
					price: 50_000,
					plz: "79111",
					city: "Freiburg",
					propertyType: "Haus",
					wohnflaeche: 80,
					zimmer: 4,
				}),
				criteria,
			);
			expect(result.passed).toBe(false);
			expect(result.rejectionType).toBe("kriterien_mismatch");
			expect(result.details[0]).toContain("unter Minimum");
		});

		test("rejects when price too high", async () => {
			const result = await gate.check(
				signals({
					price: 2_000_000,
					plz: "79111",
					city: "Freiburg",
					propertyType: "Haus",
					wohnflaeche: 200,
					zimmer: 6,
				}),
				criteria,
			);
			expect(result.passed).toBe(false);
			expect(result.rejectionType).toBe("kriterien_mismatch");
			expect(result.details[0]).toContain("über Maximum");
		});

		test("rejects when property type does not match", async () => {
			const result = await gate.check(
				signals({
					price: 500_000,
					propertyType: "Grundstück",
					plz: "79111",
					city: "Freiburg",
					wohnflaeche: 0,
					zimmer: 0,
				}),
				criteria,
			);
			expect(result.passed).toBe(false);
			expect(result.details[0]).toContain("Grundstück");
		});

		test("rejects when PLZ is outside region", async () => {
			const result = await gate.check(
				signals({
					price: 500_000,
					propertyType: "Haus",
					plz: "80333",
					city: "München",
					wohnflaeche: 120,
					zimmer: 5,
				}),
				criteria,
			);
			expect(result.passed).toBe(false);
			expect(result.details).toEqual(
				expect.arrayContaining([expect.stringContaining("PLZ")]),
			);
		});

		test("rejects when wohnflaeche too small", async () => {
			const result = await gate.check(
				signals({
					price: 300_000,
					propertyType: "Wohnung",
					plz: "79111",
					city: "Freiburg",
					wohnflaeche: 30,
					zimmer: 3,
				}),
				criteria,
			);
			expect(result.passed).toBe(false);
			expect(result.details[0]).toContain("Wohnfläche");
		});

		test("rejects when too few zimmer", async () => {
			const result = await gate.check(
				signals({
					price: 300_000,
					propertyType: "Wohnung",
					plz: "79111",
					city: "Freiburg",
					wohnflaeche: 60,
					zimmer: 1,
				}),
				criteria,
			);
			expect(result.passed).toBe(false);
			expect(result.details[0]).toContain("Zimmer");
		});

		test("passes when criteria are empty (no filtering)", async () => {
			const result = await gate.check(
				signals({ price: 999_999_999, propertyType: "Schloss" }),
				{},
			);
			expect(result.passed).toBe(true);
		});

		test("passes when no criteria provided", async () => {
			const result = await gate.check(
				signals({ price: 999_999_999, propertyType: "Schloss" }),
			);
			expect(result.passed).toBe(true);
		});

		test("skips price check when listing has no price", async () => {
			const result = await gate.check(
				signals({
					price: 0,
					propertyType: "Haus",
					plz: "79111",
					city: "Freiburg",
					wohnflaeche: 100,
					zimmer: 4,
				}),
				criteria,
			);
			expect(result.passed).toBe(true);
		});

		test("skips zimmer check when listing has no zimmer", async () => {
			const result = await gate.check(
				signals({
					price: 500_000,
					propertyType: "Haus",
					plz: "79111",
					city: "Freiburg",
					wohnflaeche: 100,
					zimmer: 0,
				}),
				criteria,
			);
			expect(result.passed).toBe(true);
		});

		test("partial city match: 'Freiburg im Breisgau' matches 'Freiburg'", async () => {
			const result = await gate.check(
				signals({
					price: 500_000,
					propertyType: "Haus",
					plz: "79111",
					city: "Freiburg im Breisgau",
					wohnflaeche: 100,
					zimmer: 4,
				}),
				criteria,
			);
			expect(result.passed).toBe(true);
		});

		test("partial city match: criteria 'München' matches listing 'München-Pasing'", async () => {
			const result = await gate.check(
				signals({
					price: 500_000,
					propertyType: "Haus",
					plz: "80000",
					city: "München-Pasing",
					wohnflaeche: 100,
					zimmer: 4,
				}),
				{ cities: ["München"], plzPrefixes: ["80"] },
			);
			expect(result.passed).toBe(true);
		});

		test("property type match is case-insensitive", async () => {
			const result = await gate.check(
				signals({
					price: 500_000,
					propertyType: "haus",
					plz: "79111",
					city: "Freiburg",
					wohnflaeche: 100,
					zimmer: 4,
				}),
				criteria,
			);
			expect(result.passed).toBe(true);
		});

		test("bundesland check works", async () => {
			const result = await gate.check(
				signals({
					price: 500_000,
					propertyType: "Haus",
					plz: "79111",
					city: "Freiburg",
					bundesland: "Sachsen",
					wohnflaeche: 100,
					zimmer: 4,
				}),
				{ ...criteria, bundeslaender: ["Baden-Württemberg"] },
			);
			expect(result.passed).toBe(false);
			expect(result.details[0]).toContain("Bundesland");
		});

		test("maxWohnflaeche works", async () => {
			const result = await gate.check(
				signals({
					price: 500_000,
					propertyType: "Haus",
					plz: "79111",
					city: "Freiburg",
					wohnflaeche: 500,
					zimmer: 4,
				}),
				{ ...criteria, maxWohnflaeche: 300 },
			);
			expect(result.passed).toBe(false);
			expect(result.details[0]).toContain("über Maximum");
		});

		test("collects multiple mismatches in details", async () => {
			const result = await gate.check(
				signals({
					price: 50_000,
					propertyType: "Grundstück",
					plz: "10115",
					city: "Berlin",
					wohnflaeche: 20,
					zimmer: 1,
				}),
				{
					minPrice: 200_000,
					propertyTypes: ["Haus"],
					plzPrefixes: ["79"],
					cities: ["Freiburg"],
					minWohnflaeche: 50,
					minZimmer: 3,
				},
			);
			expect(result.passed).toBe(false);
			expect(result.details.length).toBeGreaterThanOrEqual(4);
		});
	});

	describe("LLM-Check", () => {
		test("rejects when LLM says NEIN (Gesuch als Angebot)", async () => {
			const mockLLM = {
				generate: async () => "NEIN\nDas ist ein Suchgesuch, kein Angebot.",
			};
			const gateWithLLM = new ListingGate(mockLLM);
			const result = await gateWithLLM.check(
				signals({ rawText: "Suche 3-Zimmer-Wohnung in Freiburg" }),
			);
			expect(result.passed).toBe(false);
			expect(result.rejectionType).toBe("llm_rejection");
			expect(result.rejectionReason).toContain("Suchgesuch");
		});

		test("rejects when LLM detects Makler-Sperre", async () => {
			const mockLLM = {
				generate: async () =>
					"NEIN\nInserat enthält expliziten Hinweis: keine Makleranfragen.",
			};
			const gateWithLLM = new ListingGate(mockLLM);
			const result = await gateWithLLM.check(
				signals({
					rawText: "Schönes Haus zu verkaufen. Bitte keine Makleranfragen!",
				}),
			);
			expect(result.passed).toBe(false);
			expect(result.rejectionType).toBe("llm_rejection");
		});

		test("passes when LLM says JA", async () => {
			const mockLLM = {
				generate: async () => "JA\nEchtes Verkaufsangebot.",
			};
			const gateWithLLM = new ListingGate(mockLLM);
			const result = await gateWithLLM.check(
				signals({ rawText: "Einfamilienhaus in Freiburg zu verkaufen" }),
			);
			expect(result.passed).toBe(true);
		});

		test("passes on LLM error (fail-open)", async () => {
			const mockLLM = {
				generate: async () => {
					throw new Error("API down");
				},
			};
			const gateWithLLM = new ListingGate(mockLLM);
			const result = await gateWithLLM.check(
				signals({ rawText: "Haus zu verkaufen" }),
			);
			expect(result.passed).toBe(true);
		});

		test("LLM check only runs after criteria checks pass", async () => {
			let llmCalled = false;
			const mockLLM = {
				generate: async () => {
					llmCalled = true;
					return "JA\nOk.";
				},
			};
			const gateWithLLM = new ListingGate(mockLLM);
			const result = await gateWithLLM.check(
				signals({
					rawText: "Haus zu verkaufen",
					price: 50_000,
					propertyType: "Haus",
				}),
				{ minPrice: 200_000 },
			);
			expect(result.passed).toBe(false);
			expect(result.rejectionType).toBe("kriterien_mismatch");
			expect(llmCalled).toBe(false);
		});

		test("LLM check skipped when no LLMClient provided", async () => {
			const gateWithoutLLM = new ListingGate();
			const result = await gateWithoutLLM.check(
				signals({ rawText: "Suche Wohnung in Freiburg" }),
			);
			// Ohne LLM wird das Gesuch nicht erkannt
			expect(result.passed).toBe(true);
		});
	});
});
