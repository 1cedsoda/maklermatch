import type { Page } from "patchright";
import type { DeepPartial, HumanizeConfig } from "./config";
import { mergeConfig } from "./config";
import { logger } from "./logger";
import { randBetween, sleep } from "./random";
import { getMousePosition, setMousePosition } from "./mouse-path";

const log = logger.child({ module: "idle-mouse" });

/**
 * Perform small idle mouse drift movements as if the user's hand is
 * resting on the mouse while reading.
 *
 * @param page    Patchright Page instance
 * @param opts    Optional: specify number of movements or total duration
 * @param config  Optional config overrides
 */
export async function humanIdleMouse(
	page: Page,
	opts?: { durationMs?: number; movements?: number },
	config?: DeepPartial<HumanizeConfig>,
): Promise<void> {
	const cfg = mergeConfig(config);
	const speed = cfg.delays.speedFactor;

	// Determine iteration count
	let count: number;
	if (opts?.movements != null) {
		count = opts.movements;
	} else if (opts?.durationMs != null) {
		const avgCycle =
			(cfg.idleMouse.driftDuration[0] + cfg.idleMouse.driftDuration[1]) / 2 +
			(cfg.idleMouse.driftPause[0] + cfg.idleMouse.driftPause[1]) / 2;
		count = Math.max(1, Math.round(opts.durationMs / (avgCycle * speed)));
	} else {
		count = Math.round(randBetween(...cfg.browse.idleMovements));
	}

	log.debug({ movements: count }, "Idle mouse drift");

	const viewport = page.viewportSize() ?? { width: 1920, height: 1080 };

	for (let i = 0; i < count; i++) {
		const current = getMousePosition(page);

		// Random target within drift radius, clamped to viewport
		const radius = randBetween(...cfg.idleMouse.driftRadius);
		const angle = Math.random() * 2 * Math.PI;
		const targetX = Math.max(
			20,
			Math.min(viewport.width - 20, current.x + Math.cos(angle) * radius),
		);
		const targetY = Math.max(
			20,
			Math.min(viewport.height - 20, current.y + Math.sin(angle) * radius),
		);

		// Simple linear interpolation with 3-5 intermediate steps
		const steps = Math.round(randBetween(3, 5));
		const driftDuration = randBetween(...cfg.idleMouse.driftDuration) * speed;
		const stepDelay = driftDuration / steps;

		for (let s = 1; s <= steps; s++) {
			const t = s / steps;
			const x = current.x + (targetX - current.x) * t;
			const y = current.y + (targetY - current.y) * t;
			await page.mouse.move(x, y);
			await sleep(stepDelay);
		}

		setMousePosition(page, { x: targetX, y: targetY });

		// Pause between drifts
		if (i < count - 1) {
			await sleep(randBetween(...cfg.idleMouse.driftPause) * speed);
		}
	}
}
