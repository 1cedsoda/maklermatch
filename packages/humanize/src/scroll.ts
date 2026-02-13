import type { Page } from "patchright";
import type { DeepPartial, HumanizeConfig } from "./config";
import { mergeConfig } from "./config";
import { randBetween, sleep } from "./random";

/**
 * Scroll the page in a human-like pattern: bursts of small scroll steps
 * interspersed with reading pauses.
 *
 * @param page    Patchright Page instance
 * @param pixels  Total approximate pixels to scroll. If omitted, scrolls a
 *                random fraction of the scrollable area.
 * @param config  Optional config overrides
 */
export async function humanScroll(
	page: Page,
	pixels?: number,
	config?: DeepPartial<HumanizeConfig>,
): Promise<void> {
	const cfg = mergeConfig(config);
	const speed = cfg.delays.speedFactor;

	// Determine how far to scroll
	let totalPixels = pixels;
	if (totalPixels == null) {
		const { scrollHeight, clientHeight } = await page.evaluate(() => ({
			scrollHeight: document.body.scrollHeight,
			clientHeight: window.innerHeight,
		}));
		const scrollable = Math.max(0, scrollHeight - clientHeight);
		const [minFrac, maxFrac] = cfg.browse.scrollFraction;
		totalPixels = Math.round(scrollable * randBetween(minFrac, maxFrac));
	}

	if (totalPixels <= 0) return;

	let scrolled = 0;

	while (scrolled < totalPixels) {
		// Scroll burst
		const burstLen = Math.round(randBetween(...cfg.scroll.burstLength));

		for (let i = 0; i < burstLen && scrolled < totalPixels; i++) {
			// Momentum curve: ramp up quickly, then decelerate gradually
			const progress = burstLen > 1 ? i / (burstLen - 1) : 0.5;
			const momentumMultiplier =
				progress < 0.3
					? 0.4 + (progress / 0.3) * 0.6 // acceleration: 0.4 → 1.0
					: 1.0 - ((progress - 0.3) / 0.7) * 0.7; // deceleration: 1.0 → 0.3

			const baseStep = randBetween(...cfg.scroll.scrollStep);
			const step = Math.min(
				Math.max(1, Math.round(baseStep * momentumMultiplier)),
				totalPixels - scrolled,
			);
			await page.mouse.wheel(0, step);
			scrolled += step;

			// Delays inversely follow momentum: shorter at peak speed, longer at edges
			const delayMultiplier =
				progress < 0.3
					? 1.5 - (progress / 0.3) * 0.5 // slower during acceleration
					: 1.0 + ((progress - 0.3) / 0.7) * 0.8; // slower during deceleration
			await sleep(
				randBetween(...cfg.scroll.scrollStepDelay) * speed * delayMultiplier,
			);
		}

		// Occasional small upward scroll to simulate re-reading (~10% chance)
		if (Math.random() < 0.1 && scrolled > 100) {
			const backStep = Math.round(randBetween(50, 150));
			await page.mouse.wheel(0, -backStep);
			await sleep(randBetween(200, 500) * speed);
		}

		// Reading pause between bursts
		if (
			scrolled < totalPixels &&
			Math.random() < cfg.scroll.scrollPauseProbability
		) {
			await sleep(randBetween(...cfg.scroll.scrollPauseDuration) * speed);
		}
	}
}
