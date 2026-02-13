import { describe, expect, test } from "bun:test";
import type { LLMClient } from "../message-generator";
import { Safeguard } from "../safeguard";

function mockLLM(response: string): LLMClient {
	return {
		generate: async () => response,
	};
}

describe("Safeguard", () => {
	test("passes when LLM says JA", async () => {
		const sg = new Safeguard(mockLLM("JA\nKlingt natürlich"));
		const result = await sg.check(
			"Hey, die Wohnung sieht cool aus. Steht die noch?",
		);
		expect(result.passed).toBe(true);
		expect(result.reason).toBeNull();
	});

	test("fails when LLM says NEIN", async () => {
		const sg = new Safeguard(
			mockLLM("NEIN\nZu perfekte Grammatik, klingt nach AI"),
		);
		const result = await sg.check(
			"Gerne würde ich Ihnen ein unverbindliches Angebot unterbreiten.",
		);
		expect(result.passed).toBe(false);
		expect(result.reason).toContain("perfekte Grammatik");
	});

	test("extracts reason from second line", async () => {
		const sg = new Safeguard(mockLLM("NEIN\nEm-dash detected"));
		const result = await sg.check("test");
		expect(result.passed).toBe(false);
		expect(result.reason).toBe("Em-dash detected");
	});

	test("passes on LLM error (fail-open)", async () => {
		const failingLLM: LLMClient = {
			generate: async () => {
				throw new Error("API timeout");
			},
		};
		const sg = new Safeguard(failingLLM);
		const result = await sg.check("test message");
		expect(result.passed).toBe(true);
		expect(result.reason).toBeNull();
	});

	test("handles JA with extra text on same line", async () => {
		const sg = new Safeguard(mockLLM("JA, klingt gut"));
		const result = await sg.check("test");
		expect(result.passed).toBe(true);
	});
});
