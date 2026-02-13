import type { Page } from "patchright";
import type { DeepPartial, HumanizeConfig } from "./config";
import { mergeConfig } from "./config";
import { randBetween, sleep } from "./random";

/**
 * Simulate the user switching to another browser tab and coming back.
 * Dispatches blur/focus events and changes document.visibilityState.
 *
 * The probability check is built-in: this function is a no-op most of the
 * time, so it's safe to call frequently (e.g. inside humanBrowse).
 */
export async function humanTabSwitch(
	page: Page,
	config?: DeepPartial<HumanizeConfig>,
): Promise<void> {
	const cfg = mergeConfig(config);

	if (Math.random() > cfg.tabSwitch.probability) return;

	// Simulate leaving the tab
	await page.evaluate(() => {
		Object.defineProperty(document, "visibilityState", {
			value: "hidden",
			writable: true,
			configurable: true,
		});
		Object.defineProperty(document, "hidden", {
			value: true,
			writable: true,
			configurable: true,
		});
		document.dispatchEvent(new Event("visibilitychange"));
		window.dispatchEvent(new Event("blur"));
	});

	// User is looking at another tab
	await sleep(
		randBetween(...cfg.tabSwitch.awayDuration) * cfg.delays.speedFactor,
	);

	// Simulate returning to the tab
	await page.evaluate(() => {
		Object.defineProperty(document, "visibilityState", {
			value: "visible",
			writable: true,
			configurable: true,
		});
		Object.defineProperty(document, "hidden", {
			value: false,
			writable: true,
			configurable: true,
		});
		document.dispatchEvent(new Event("visibilitychange"));
		window.dispatchEvent(new Event("focus"));
	});
}
