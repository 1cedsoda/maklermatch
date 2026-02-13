import type { Page, Locator } from "patchright";
import type { DeepPartial, HumanizeConfig } from "./config";
import { mergeConfig } from "./config";
import { logger } from "./logger";
import { randBetween, sleep } from "./random";

const log = logger.child({ module: "scroll" });

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
		const { scrollHeight, clientHeight, scrollTop } = await page.evaluate(
			() => ({
				scrollHeight: (document.body ?? document.documentElement).scrollHeight,
				clientHeight: window.innerHeight,
				scrollTop:
					document.documentElement.scrollTop || document.body.scrollTop,
			}),
		);
		const remaining = Math.max(0, scrollHeight - clientHeight - scrollTop);
		const [minFrac, maxFrac] = cfg.browse.scrollFraction;
		totalPixels = Math.round(remaining * randBetween(minFrac, maxFrac));
	}

	if (totalPixels <= 0) return;
	log.debug({ pixels: totalPixels }, "Scrolling");

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

/**
 * Scroll humanly to bring a specific element into a comfortable viewport
 * position. Uses humanScroll for downward movement (the common case when
 * scanning a list top-to-bottom) and small wheel bursts for the rare
 * upward case.
 */
export async function humanScrollToElement(
	page: Page,
	locator: Locator,
	config?: DeepPartial<HumanizeConfig>,
): Promise<void> {
	const cfg = mergeConfig(config);
	const speed = cfg.delays.speedFactor;

	await locator.waitFor({ state: "attached", timeout: 10000 });
	const box = await locator.boundingBox();
	if (!box) return;

	const viewportHeight = await page.evaluate(() => window.innerHeight);

	// Element is already comfortably visible in the middle 70% of the viewport
	if (
		box.y > viewportHeight * 0.1 &&
		box.y + box.height < viewportHeight * 0.85
	) {
		// Occasional tiny drift scroll for naturalness
		if (Math.random() < 0.25) {
			await humanScroll(page, Math.round(randBetween(15, 50)), config);
		}
		return;
	}

	// Target: place the element in the top 30-50% of the viewport
	const targetY = viewportHeight * randBetween(0.3, 0.5);
	const elementCenterY = box.y + box.height / 2;
	const scrollNeeded = elementCenterY - targetY;

	if (scrollNeeded > 10) {
		// Element is below viewport — scroll down naturally
		log.debug(
			{ pixels: Math.round(scrollNeeded) },
			"Scrolling down to element",
		);
		await humanScroll(page, Math.round(scrollNeeded), config);
	} else if (scrollNeeded < -10) {
		// Element is above viewport — scroll up with small bursts
		const upPixels = Math.abs(Math.round(scrollNeeded));
		log.debug({ pixels: upPixels }, "Scrolling up to element");
		let scrolled = 0;
		while (scrolled < upPixels) {
			const step = Math.min(
				Math.round(randBetween(...cfg.scroll.scrollStep)),
				upPixels - scrolled,
			);
			await page.mouse.wheel(0, -step);
			scrolled += step;
			await sleep(randBetween(...cfg.scroll.scrollStepDelay) * speed);
		}
	}
}
