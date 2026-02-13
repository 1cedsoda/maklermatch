import type { Page, Locator } from "patchright";
import type { DeepPartial, HumanizeConfig } from "./config";
import { mergeConfig } from "./config";
import { logger } from "./logger";
import { humanClick } from "./click";
import { randBetween, sleep } from "./random";

const log = logger.child({ module: "fill" });

export async function humanFill(
	page: Page,
	locator: Locator,
	text: string,
	config?: DeepPartial<HumanizeConfig>,
): Promise<void> {
	const cfg = mergeConfig(config);
	log.debug({ length: text.length }, "Filling input");

	// Click the input field first (human-like)
	if (cfg.typing.clickBeforeTyping) {
		await humanClick(page, locator, config);
	}

	// Select all existing content and clear it
	await page.keyboard.down("ControlOrMeta");
	await page.keyboard.press("a");
	await page.keyboard.up("ControlOrMeta");
	await sleep(randBetween(30, 80));
	await page.keyboard.press("Backspace");
	await sleep(randBetween(50, 120));

	// Type each character with realistic timing
	const [minDelay, maxDelay] = cfg.typing.keystrokeDelay;
	const thinkProb = cfg.typing.thinkPauseProbability;
	const [minThink, maxThink] = cfg.typing.thinkPauseDuration;

	for (let i = 0; i < text.length; i++) {
		const char = text[i];

		// Use insertText for non-ASCII (e.g. German umlauts) to avoid key mapping issues
		if (char.charCodeAt(0) > 127) {
			await page.keyboard.insertText(char);
		} else {
			await page.keyboard.press(char);
		}

		// Don't delay after the last character
		if (i === text.length - 1) break;

		// Base inter-keystroke delay
		let delay = randBetween(minDelay, maxDelay);

		// Spaces and word boundaries tend to be slightly longer
		if (char === " " || text[i + 1] === " ") {
			delay *= randBetween(1.2, 1.8);
		}

		// Random "thinking" pause
		if (Math.random() < thinkProb) {
			delay += randBetween(minThink, maxThink);
		}

		await sleep(delay * cfg.delays.speedFactor);
	}
}
