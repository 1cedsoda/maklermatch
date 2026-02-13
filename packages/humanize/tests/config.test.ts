import { describe, expect, test } from "bun:test";
import { createConfig, mergeConfig } from "../src/config";

describe("createConfig", () => {
	test("returns default config with no argument", () => {
		const cfg = createConfig();
		expect(cfg.mouse.moveDuration).toEqual([180, 600]);
		expect(cfg.typing.keystrokeDelay).toEqual([45, 130]);
		expect(cfg.delays.speedFactor).toBe(1.0);
	});

	test("returns default config with 'normal' preset", () => {
		const cfg = createConfig("normal");
		expect(cfg.mouse.moveDuration).toEqual([180, 600]);
	});

	test("returns faster config with 'fast' preset", () => {
		const cfg = createConfig("fast");
		expect(cfg.mouse.moveDuration).toEqual([100, 300]);
		expect(cfg.delays.speedFactor).toBe(0.6);
	});

	test("returns slower config with 'cautious' preset", () => {
		const cfg = createConfig("cautious");
		expect(cfg.mouse.moveDuration).toEqual([300, 900]);
		expect(cfg.delays.speedFactor).toBe(1.5);
	});
});

describe("mergeConfig", () => {
	test("returns defaults when called with no arguments", () => {
		const cfg = mergeConfig();
		expect(cfg.mouse.targetJitter).toBe(0.25);
		expect(cfg.typing.clickBeforeTyping).toBe(true);
	});

	test("overrides specific mouse properties", () => {
		const cfg = mergeConfig({ mouse: { targetJitter: 0.1 } });
		expect(cfg.mouse.targetJitter).toBe(0.1);
		// Other mouse properties should still have defaults
		expect(cfg.mouse.moveDuration).toEqual([180, 600]);
	});

	test("overrides specific typing properties", () => {
		const cfg = mergeConfig({ typing: { clickBeforeTyping: false } });
		expect(cfg.typing.clickBeforeTyping).toBe(false);
		expect(cfg.typing.keystrokeDelay).toEqual([45, 130]);
	});

	test("overrides speed factor", () => {
		const cfg = mergeConfig({ delays: { speedFactor: 2.0 } });
		expect(cfg.delays.speedFactor).toBe(2.0);
	});
});
