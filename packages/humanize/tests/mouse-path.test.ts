import { describe, expect, test } from "bun:test";
import { generateTimings } from "../src/mouse-path";

describe("generateTimings", () => {
	test("returns correct number of delays", () => {
		const timings = generateTimings(20, 500);
		expect(timings).toHaveLength(20);
	});

	test("total delay approximately matches target duration", () => {
		const totalDuration = 400;
		const timings = generateTimings(30, totalDuration);
		const total = timings.reduce((a, b) => a + b, 0);
		expect(total).toBeCloseTo(totalDuration, -1);
	});

	test("delays are slower at edges and faster in middle (ease-in-out)", () => {
		const timings = generateTimings(40, 1000);

		// Average of first 5 delays (start — should be slow)
		const startAvg = timings.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
		// Average of middle 5 delays (middle — should be fast)
		const midStart = Math.floor(timings.length / 2) - 2;
		const midAvg =
			timings.slice(midStart, midStart + 5).reduce((a, b) => a + b, 0) / 5;
		// Average of last 5 delays (end — should be slow)
		const endAvg = timings.slice(-5).reduce((a, b) => a + b, 0) / 5;

		// Start and end should be slower (larger delays) than middle
		expect(startAvg).toBeGreaterThan(midAvg);
		expect(endAvg).toBeGreaterThan(midAvg);
	});

	test("all delays are positive", () => {
		const timings = generateTimings(50, 800);
		for (const t of timings) {
			expect(t).toBeGreaterThan(0);
		}
	});
});
