import { describe, expect, test } from "bun:test";
import { DelayCalculator } from "../delay-calculator";

describe("DelayCalculator", () => {
	test("first message delay is between 2-20 minutes", () => {
		const calc = new DelayCalculator();
		for (let i = 0; i < 50; i++) {
			const result = calc.calculate(100, true);
			expect(result.delayMs).toBeGreaterThanOrEqual(120_000);
			expect(result.delayMs).toBeLessThanOrEqual(1_200_000);
			expect(result.reason).toBe("first_message");
		}
	});

	test("online mode delay is shorter than first message", () => {
		const calc = new DelayCalculator();
		calc.markActive();
		let maxOnline = 0;
		for (let i = 0; i < 100; i++) {
			const result = calc.calculate(100, false);
			if (result.reason === "online") {
				maxOnline = Math.max(maxOnline, result.delayMs);
			}
		}
		// Online delays should generally be much shorter than first message minimum
		// (AFK can push it higher, but online-reason ones should be short)
		expect(maxOnline).toBeLessThan(120_000);
	});

	test("test mode returns 0 delay but preserves reason info", () => {
		const calc = new DelayCalculator({ testMode: true });
		const result = calc.calculate(100, true);
		expect(result.delayMs).toBe(0);
		expect(result.reason).toContain("first_message");
		expect(result.reason).toContain("test_mode");
	});

	test("markActive changes state", () => {
		const calc = new DelayCalculator();
		expect(calc.isActive()).toBe(false);
		calc.markActive();
		expect(calc.isActive()).toBe(true);
	});

	test("longer messages produce longer online delays", () => {
		const calc = new DelayCalculator();
		calc.markActive();

		let shortTotal = 0;
		let longTotal = 0;
		const runs = 200;

		for (let i = 0; i < runs; i++) {
			const short = calc.calculate(20, false);
			const long = calc.calculate(500, false);
			if (short.reason === "online") shortTotal += short.delayMs;
			if (long.reason === "online") longTotal += long.delayMs;
		}

		// On average, long messages should have longer delays
		expect(longTotal / runs).toBeGreaterThan(shortTotal / runs);
	});
});
