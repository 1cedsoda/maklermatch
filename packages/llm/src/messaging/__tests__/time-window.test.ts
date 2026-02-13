import { describe, expect, test } from "bun:test";
import { TimePeriod, TimeWindow } from "../time-window";

function date(
	year: number,
	month: number,
	day: number,
	hour: number,
	minute = 0,
): Date {
	return new Date(year, month - 1, day, hour, minute, 0, 0);
}

// 2026-02-16 is a Monday, 2026-02-14 is Saturday, 2026-02-15 is Sunday
const MON_10AM = date(2026, 2, 16, 10, 0);
const MON_7AM = date(2026, 2, 16, 7, 0);
const MON_7_21 = date(2026, 2, 16, 7, 21);
const MON_7_22 = date(2026, 2, 16, 7, 22);
const MON_8_59 = date(2026, 2, 16, 8, 59);
const MON_17_00 = date(2026, 2, 16, 17, 0);
const MON_20_00 = date(2026, 2, 16, 20, 0);
const MON_23_59 = date(2026, 2, 16, 23, 59);
const SAT_12PM = date(2026, 2, 14, 12, 0);
const SUN_15PM = date(2026, 2, 15, 15, 0);
const SAT_3AM = date(2026, 2, 14, 3, 0);

describe("TimeWindow", () => {
	const tw = new TimeWindow();

	describe("classify", () => {
		test("Monday 10:00 is business hours", () => {
			expect(tw.classify(MON_10AM)).toBe(TimePeriod.BUSINESS_HOURS);
		});

		test("Monday 7:00 is outside chat window", () => {
			expect(tw.classify(MON_7AM)).toBe(TimePeriod.OUTSIDE_CHAT_WINDOW);
		});

		test("Monday 7:21 is outside chat window", () => {
			expect(tw.classify(MON_7_21)).toBe(TimePeriod.OUTSIDE_CHAT_WINDOW);
		});

		test("Monday 7:22 is off-hours (chat window start)", () => {
			expect(tw.classify(MON_7_22)).toBe(TimePeriod.OFF_HOURS);
		});

		test("Monday 8:59 is off-hours", () => {
			expect(tw.classify(MON_8_59)).toBe(TimePeriod.OFF_HOURS);
		});

		test("Monday 17:00 is off-hours", () => {
			expect(tw.classify(MON_17_00)).toBe(TimePeriod.OFF_HOURS);
		});

		test("Monday 20:00 is off-hours", () => {
			expect(tw.classify(MON_20_00)).toBe(TimePeriod.OFF_HOURS);
		});

		test("Monday 23:59 is off-hours", () => {
			expect(tw.classify(MON_23_59)).toBe(TimePeriod.OFF_HOURS);
		});

		test("Saturday 12:00 is weekend", () => {
			expect(tw.classify(SAT_12PM)).toBe(TimePeriod.WEEKEND);
		});

		test("Sunday 15:00 is weekend", () => {
			expect(tw.classify(SUN_15PM)).toBe(TimePeriod.WEEKEND);
		});

		test("Saturday 3:00 is outside chat window (before 7:22)", () => {
			expect(tw.classify(SAT_3AM)).toBe(TimePeriod.OUTSIDE_CHAT_WINDOW);
		});
	});

	describe("isInChatWindow", () => {
		test("7:21 is not in chat window", () => {
			expect(tw.isInChatWindow(MON_7_21)).toBe(false);
		});

		test("7:22 is in chat window", () => {
			expect(tw.isInChatWindow(MON_7_22)).toBe(true);
		});

		test("23:59 is in chat window", () => {
			expect(tw.isInChatWindow(MON_23_59)).toBe(true);
		});

		test("7:00 is not in chat window", () => {
			expect(tw.isInChatWindow(MON_7AM)).toBe(false);
		});
	});

	describe("getNextChatWindowStart", () => {
		test("returns same time if already in window", () => {
			const result = tw.getNextChatWindowStart(MON_10AM);
			expect(result.getTime()).toBe(MON_10AM.getTime());
		});

		test("returns 7:22 same day if before window", () => {
			const result = tw.getNextChatWindowStart(MON_7AM);
			expect(result.getHours()).toBe(7);
			expect(result.getMinutes()).toBe(22);
			expect(result.getDate()).toBe(16);
		});

		test("returns 7:22 next day for Saturday 3am", () => {
			const result = tw.getNextChatWindowStart(SAT_3AM);
			expect(result.getHours()).toBe(7);
			expect(result.getMinutes()).toBe(22);
			expect(result.getDate()).toBe(14); // same day, later
		});
	});

	describe("adjustDelay", () => {
		const BASE = 60_000; // 1 min

		test("business hours returns base delay unmodified", () => {
			const result = tw.adjustDelay(BASE, MON_10AM);
			expect(result.delayMs).toBe(BASE);
			expect(result.skipped).toBe(false);
			expect(result.period).toBe(TimePeriod.BUSINESS_HOURS);
		});

		test("off-hours multiplies delay by 3-8x", () => {
			for (let i = 0; i < 50; i++) {
				const result = tw.adjustDelay(BASE, MON_20_00);
				if (!result.skipped) {
					expect(result.delayMs).toBeGreaterThanOrEqual(BASE * 3);
					expect(result.delayMs).toBeLessThanOrEqual(BASE * 8);
					expect(result.period).toBe(TimePeriod.OFF_HOURS);
				}
			}
		});

		test("weekend multiplies delay by 5-15x", () => {
			for (let i = 0; i < 50; i++) {
				const result = tw.adjustDelay(BASE, SAT_12PM);
				if (!result.skipped) {
					expect(result.delayMs).toBeGreaterThanOrEqual(BASE * 5);
					expect(result.delayMs).toBeLessThanOrEqual(BASE * 15);
					expect(result.period).toBe(TimePeriod.WEEKEND);
				}
			}
		});

		test("outside chat window adds wait time until next window", () => {
			const result = tw.adjustDelay(BASE, MON_7AM);
			// 7:00 -> 7:22 = 22 minutes = 1_320_000ms + BASE
			expect(result.delayMs).toBeGreaterThanOrEqual(1_320_000 + BASE - 1000);
			expect(result.delayMs).toBeLessThanOrEqual(1_320_000 + BASE + 1000);
			expect(result.skipped).toBe(false);
			expect(result.period).toBe(TimePeriod.OUTSIDE_CHAT_WINDOW);
		});

		test("off-hours skip probability roughly matches 10%", () => {
			let skipped = 0;
			const runs = 2000;
			for (let i = 0; i < runs; i++) {
				const result = tw.adjustDelay(BASE, MON_20_00);
				if (result.skipped) skipped++;
			}
			const rate = skipped / runs;
			expect(rate).toBeGreaterThan(0.03);
			expect(rate).toBeLessThan(0.2);
		});

		test("weekend skip probability roughly matches 20%", () => {
			let skipped = 0;
			const runs = 2000;
			for (let i = 0; i < runs; i++) {
				const result = tw.adjustDelay(BASE, SAT_12PM);
				if (result.skipped) skipped++;
			}
			const rate = skipped / runs;
			expect(rate).toBeGreaterThan(0.1);
			expect(rate).toBeLessThan(0.35);
		});
	});
});
