import type { Page, Locator } from "patchright";
import type { DeepPartial, HumanizeConfig } from "./config";
import { mergeConfig } from "./config";
import { logger } from "./logger";
import { randBetween, sleep } from "./random";
import {
	getMousePosition,
	setMousePosition,
	moveMouseHumanly,
} from "./mouse-path";
import { humanHover } from "./hover";

const log = logger.child({ module: "click" });

export async function humanClick(
	page: Page,
	locator: Locator,
	config?: DeepPartial<HumanizeConfig>,
): Promise<void> {
	const cfg = mergeConfig(config);

	// Optionally hover over the element first
	if (Math.random() < cfg.hover.hoverProbability) {
		log.debug("Clicking element (with hover)");
		await humanHover(page, locator, config);

		// Mouse is already on target — just do pre-click delay + click
		const [minPre, maxPre] = cfg.mouse.preClickDelay;
		await sleep(randBetween(minPre, maxPre) * cfg.delays.speedFactor);

		const [minHold, maxHold] = cfg.mouse.clickHoldDuration;
		await page.mouse.down();
		await sleep(randBetween(minHold, maxHold) * cfg.delays.speedFactor);
		await page.mouse.up();
		return;
	}

	// Wait for the element to be attached and stable before scrolling
	await locator.waitFor({ state: "attached", timeout: 10000 });

	// Ensure the element is visible in the viewport
	await locator.scrollIntoViewIfNeeded();

	// Get element position and size
	const box = await locator.boundingBox();
	if (!box) {
		throw new Error("Element is not visible or has no bounding box");
	}

	// Random target point within the element (not dead center)
	const jitter = cfg.mouse.targetJitter;
	const targetX = box.x + box.width * (0.5 + randBetween(-jitter, jitter));
	const targetY = box.y + box.height * (0.5 + randBetween(-jitter, jitter));
	log.debug(
		{ x: Math.round(targetX), y: Math.round(targetY) },
		"Clicking element",
	);

	// Move mouse along a Bezier curve to the target
	const currentPos = getMousePosition(page);
	await moveMouseHumanly(page, currentPos, { x: targetX, y: targetY }, cfg);

	// Small pre-click pause
	const [minPre, maxPre] = cfg.mouse.preClickDelay;
	await sleep(randBetween(minPre, maxPre) * cfg.delays.speedFactor);

	// Click with realistic hold duration
	const [minHold, maxHold] = cfg.mouse.clickHoldDuration;
	await page.mouse.down();
	await sleep(randBetween(minHold, maxHold) * cfg.delays.speedFactor);
	await page.mouse.up();

	// Track the new mouse position
	setMousePosition(page, { x: targetX, y: targetY });
}
