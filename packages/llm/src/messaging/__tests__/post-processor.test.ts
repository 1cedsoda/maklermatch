import { describe, expect, test } from "bun:test";
import { PostProcessor } from "../post-processor";

const pp = new PostProcessor();

describe("PostProcessor", () => {
	describe("fixDashes", () => {
		test("replaces em-dash with --", () => {
			const input = "Das ist toll — wirklich gut";
			const result = pp.process(input);
			expect(result).not.toContain("\u2014");
			expect(result).toContain("--");
		});

		test("replaces en-dash with --", () => {
			const input = "Preis: 200.000–250.000€";
			const result = pp.process(input);
			expect(result).not.toContain("\u2013");
			expect(result).toContain("--");
		});

		test("replaces multiple dashes in one text", () => {
			const input = "Erst das \u2014 dann das \u2014 und noch das";
			const result = pp.process(input);
			expect(result).not.toContain("\u2014");
			expect(result.match(/--/g)?.length).toBe(2);
		});

		test("preserves regular hyphens", () => {
			const input = "Wohn-Ess-Bereich mit Einbauküche";
			const result = pp.process(input);
			expect(result).toContain("Wohn-Ess-Bereich");
		});

		test("preserves double dashes that are already correct", () => {
			const input = "Das ist toll -- wirklich gut";
			const result = pp.process(input);
			expect(result).toContain("--");
		});
	});

	describe("humanize", () => {
		test("does not destroy content when applying typo", () => {
			// Run many times to catch both paths (typo applied vs not)
			const input = "Hallo, die Wohnung sieht gut aus. Ist sie noch verfügbar?";
			for (let i = 0; i < 100; i++) {
				const result = pp.process(input);
				// Length should be within reasonable range (typo might remove 1 char)
				expect(result.length).toBeGreaterThanOrEqual(input.length - 2);
				expect(result.length).toBeLessThanOrEqual(input.length + 2);
			}
		});

		test("preserves meaning -- typo is minor", () => {
			const input =
				"Mir ist aufgefallen dass die Lage sehr gut ist. Wie lange steht das Haus schon zum Verkauf?";
			for (let i = 0; i < 50; i++) {
				const result = pp.process(input);
				// Levenshtein-style: count character-level differences
				let charDiffs = 0;
				const maxLen = Math.max(input.length, result.length);
				for (let j = 0; j < maxLen; j++) {
					if (input[j] !== result[j]) charDiffs++;
				}
				// At most a few characters should change (1 typo)
				expect(charDiffs).toBeLessThanOrEqual(4);
			}
		});
	});
});
