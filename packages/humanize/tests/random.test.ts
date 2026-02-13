import { describe, expect, test } from "bun:test";
import { randBetween, normalRandom, sleep } from "../src/random";

describe("randBetween", () => {
	test("returns values within [min, max]", () => {
		for (let i = 0; i < 100; i++) {
			const val = randBetween(5, 10);
			expect(val).toBeGreaterThanOrEqual(5);
			expect(val).toBeLessThanOrEqual(10);
		}
	});

	test("returns min when min equals max", () => {
		expect(randBetween(7, 7)).toBe(7);
	});
});

describe("normalRandom", () => {
	test("returns values centered around mean", () => {
		const samples = Array.from({ length: 1000 }, () => normalRandom(100, 10));
		const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
		// Average should be within ~5 of the mean for 1000 samples
		expect(avg).toBeGreaterThan(90);
		expect(avg).toBeLessThan(110);
	});

	test("standard deviation affects spread", () => {
		const narrow = Array.from({ length: 500 }, () => normalRandom(50, 1));
		const wide = Array.from({ length: 500 }, () => normalRandom(50, 20));

		const narrowStd = Math.sqrt(
			narrow.reduce((sum, v) => sum + (v - 50) ** 2, 0) / narrow.length,
		);
		const wideStd = Math.sqrt(
			wide.reduce((sum, v) => sum + (v - 50) ** 2, 0) / wide.length,
		);

		expect(wideStd).toBeGreaterThan(narrowStd);
	});
});

describe("sleep", () => {
	test("resolves after approximately the given time", async () => {
		const start = Date.now();
		await sleep(50);
		const elapsed = Date.now() - start;
		expect(elapsed).toBeGreaterThanOrEqual(40);
		expect(elapsed).toBeLessThan(200);
	});

	test("handles zero ms", async () => {
		await sleep(0);
	});

	test("handles negative ms", async () => {
		await sleep(-10);
	});
});
