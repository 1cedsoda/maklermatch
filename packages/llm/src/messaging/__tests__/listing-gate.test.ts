import { describe, expect, test } from "bun:test";
import { ListingGate } from "../listing-gate";
import type { CompanyCriteria } from "../models";
import { createListingSignals } from "../models";

// Ohne LLMClient → nur Kriterien-Check (kein LLM)
const gate = new ListingGate();

function signals(overrides: {
	rawText?: string;
	price?: number;
	propertyType?: string;
	zipCode?: string;
	city?: string;
	state?: string;
	livingArea?: number;
	rooms?: number;
}) {
	const s = createListingSignals(overrides.rawText ?? "Test listing");
	if (overrides.price !== undefined) s.price = overrides.price;
	if (overrides.propertyType) s.propertyType = overrides.propertyType;
	if (overrides.zipCode) s.zipCode = overrides.zipCode;
	if (overrides.city) s.city = overrides.city;
	if (overrides.state) s.state = overrides.state;
	if (overrides.livingArea !== undefined) s.livingArea = overrides.livingArea;
	if (overrides.rooms !== undefined) s.rooms = overrides.rooms;
	return s;
}

describe("ListingGate", () => {
	describe("Kriterien-Abgleich", () => {
		const criteria: CompanyCriteria = {
			minPrice: 200_000,
			maxPrice: 1_000_000,
		};

		test("passes when listing matches price range", async () => {
			const result = await gate.check(
				signals({ price: 500_000, propertyType: "Haus", zipCode: "79111" }),
				criteria,
			);
			expect(result.passed).toBe(true);
		});

		test("rejects when price too low", async () => {
			const result = await gate.check(
				signals({ price: 50_000, propertyType: "Haus", zipCode: "79111" }),
				criteria,
			);
			expect(result.passed).toBe(false);
			expect(result.rejectionType).toBe("criteria_mismatch");
			expect(result.details[0]).toContain("unter Minimum");
		});

		test("rejects when price too high", async () => {
			const result = await gate.check(
				signals({ price: 2_000_000, propertyType: "Haus", zipCode: "79111" }),
				criteria,
			);
			expect(result.passed).toBe(false);
			expect(result.rejectionType).toBe("criteria_mismatch");
			expect(result.details[0]).toContain("über Maximum");
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
				signals({ price: 0, propertyType: "Haus", zipCode: "79111" }),
				criteria,
			);
			expect(result.passed).toBe(true);
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
			expect(result.rejectionType).toBe("criteria_mismatch");
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
