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

const log = logger.child({ module: "hover" });

/**
 * Move the mouse to an element and hover over it for a natural duration,
 * simulating a user reading or considering before clicking.
 */
export async function humanHover(
	page: Page,
	locator: Locator,
	config?: DeepPartial<HumanizeConfig>,
): Promise<void> {
	const cfg = mergeConfig(config);

	await locator.waitFor({ state: "attached", timeout: 10000 });
	await locator.scrollIntoViewIfNeeded();

	const box = await locator.boundingBox();
	if (!box) {
		throw new Error("Element is not visible or has no bounding box");
	}

	// Random target within the element
	const jitter = cfg.mouse.targetJitter;
	const targetX = box.x + box.width * (0.5 + randBetween(-jitter, jitter));
	const targetY = box.y + box.height * (0.5 + randBetween(-jitter, jitter));
	log.debug(
		{ x: Math.round(targetX), y: Math.round(targetY) },
		"Hovering over element",
	);

	// Move mouse to element
	const currentPos = getMousePosition(page);
	await moveMouseHumanly(page, currentPos, { x: targetX, y: targetY }, cfg);
	setMousePosition(page, { x: targetX, y: targetY });

	// Linger on the element
	await sleep(randBetween(...cfg.hover.hoverDuration) * cfg.delays.speedFactor);
}
