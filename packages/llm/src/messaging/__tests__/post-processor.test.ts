import { describe, expect, test } from "bun:test";
import { PostProcessor } from "../post-processor";

const pp = new PostProcessor();

describe("PostProcessor", () => {
	describe("fixDashes", () => {
		test("removes em-dash as stylistic device", () => {
			const input = "Das ist toll \u2014 wirklich gut";
			const result = pp.process(input);
			expect(result).not.toContain("\u2014");
			expect(result).not.toContain("--");
			expect(result).toMatch(/Das ist toll,\s?wirklich gut/);
		});

		test("removes en-dash as stylistic device", () => {
			const input = "Das Haus \u2013 ein Traum";
			const result = pp.process(input);
			expect(result).not.toContain("\u2013");
			expect(result).toMatch(/Das Haus,\s?ein Traum/);
		});

		test("removes double-dash Gedankenstrich", () => {
			const input = "Das ist toll -- wirklich gut";
			const result = pp.process(input);
			expect(result).not.toMatch(/\s--\s/);
			expect(result).toMatch(/Das ist toll,\s?wirklich gut/);
		});

		test("removes multiple dashes in one text", () => {
			const input = "Erst das \u2014 dann das \u2014 und noch das";
			const result = pp.process(input);
			expect(result).not.toContain("\u2014");
			expect(result).not.toContain("--");
		});

		test("preserves regular hyphens in compound words", () => {
			const input = "Wohn-Ess-Bereich mit Einbauküche";
			const result = pp.process(input);
			expect(result).toContain("Wohn-Ess-Bereich");
		});

		test("does not remove hyphens that are not Gedankenstriche", () => {
			const input = "3-Zimmer-Wohnung in Berlin-Mitte";
			const result = pp.process(input);
			expect(result).toContain("3-Zimmer-Wohnung");
			expect(result).toContain("Berlin-Mitte");
		});
	});

	describe("humanize", () => {
		test("does not destroy content when applying typo", () => {
			const input = "Hallo, die Wohnung sieht gut aus. Ist sie noch verfügbar?";
			for (let i = 0; i < 100; i++) {
				const result = pp.process(input);
				expect(result.length).toBeGreaterThanOrEqual(input.length - 2);
				expect(result.length).toBeLessThanOrEqual(input.length + 2);
			}
		});

		test("preserves meaning, typo is minor", () => {
			const input =
				"Mir ist aufgefallen dass die Lage sehr gut ist. Wie lange steht das Haus schon zum Verkauf?";
			for (let i = 0; i < 50; i++) {
				const result = pp.process(input);
				let charDiffs = 0;
				const maxLen = Math.max(input.length, result.length);
				for (let j = 0; j < maxLen; j++) {
					if (input[j] !== result[j]) charDiffs++;
				}
				expect(charDiffs).toBeLessThanOrEqual(4);
			}
		});
	});
});
