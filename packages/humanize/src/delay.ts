import type { Page } from "patchright";
import type { DeepPartial, HumanizeConfig } from "./config";
import { mergeConfig } from "./config";
import { normalRandom } from "./random";

export async function humanDelay(
	page: Page,
	baseMs = 1000,
	config?: DeepPartial<HumanizeConfig>,
): Promise<void> {
	const cfg = mergeConfig(config);

	// Normal distribution centered on baseMs, stdDev = 25% of base
	const stdDev = baseMs * 0.25;
	const delay = normalRandom(baseMs, stdDev);

	// Clamp to reasonable bounds
	const clamped = Math.max(100, Math.min(delay, baseMs * 3));

	await page.waitForTimeout(clamped * cfg.delays.speedFactor);
}
