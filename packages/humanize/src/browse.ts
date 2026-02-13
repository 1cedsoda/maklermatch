import type { Page } from "patchright";
import type { DeepPartial, HumanizeConfig } from "./config";
import { mergeConfig } from "./config";
import { randBetween, sleep } from "./random";
import { humanScroll } from "./scroll";
import { humanIdleMouse } from "./idle-mouse";
import { humanTabSwitch } from "./tab-switch";

/**
 * Simulate a human browsing/reading a page. Combines variable dwell time,
 * scrolling through content, and idle mouse movements.
 *
 * Use this between major navigation actions (after page load, between
 * pagination, etc.) to avoid machine-like timing patterns.
 */
export async function humanBrowse(
	page: Page,
	config?: DeepPartial<HumanizeConfig>,
): Promise<void> {
	const cfg = mergeConfig(config);
	const speed = cfg.delays.speedFactor;
	const dwellTime = randBetween(...cfg.browse.pageDwellTime) * speed;

	// Phase 1: Initial pause — user looks at the page before doing anything
	const initialPause = dwellTime * randBetween(0.1, 0.2);
	await sleep(initialPause);

	// Phase 2: First scroll burst
	await humanScroll(page, undefined, config);

	// Phase 3: Idle mouse movements while "reading"
	const idleCount = Math.round(randBetween(...cfg.browse.idleMovements));
	if (idleCount > 0) {
		await humanIdleMouse(page, { movements: idleCount }, config);
	}

	// Phase 3.5: Occasional tab switch (probability-gated internally)
	await humanTabSwitch(page, config);

	// Phase 4: Optional second scroll (60% chance)
	if (Math.random() < 0.6) {
		await humanScroll(page, undefined, config);
	}

	// Phase 5: Final short pause before the next action
	const finalPause = dwellTime * randBetween(0.05, 0.15);
	await sleep(finalPause);
}
