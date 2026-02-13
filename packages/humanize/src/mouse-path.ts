import type { Page } from "patchright";
import type { Point } from "./types";
import type { HumanizeConfig } from "./config";
import { generateBezierPath } from "./bezier";
import { randBetween, sleep } from "./random";

/**
 * Generate inter-step delays that produce ease-in-out movement.
 * Uses smoothstep derivative so the mouse starts slow, speeds up,
 * then slows down approaching the target.
 */
export function generateTimings(
	stepCount: number,
	totalDurationMs: number,
): number[] {
	const delays: number[] = [];

	for (let i = 0; i < stepCount; i++) {
		const progress = i / stepCount;

		// Speed from smoothstep derivative: 6t(1-t), peaks at t=0.5
		const speed = 6 * progress * (1 - progress);

		// Clamp minimum speed to avoid near-zero division at edges
		const clampedSpeed = Math.max(speed, 0.15);

		// Delay inversely proportional to speed
		const baseDelay = totalDurationMs / stepCount / clampedSpeed;

		// Small random jitter (+/- 15%)
		const jitter = 1 + (Math.random() - 0.5) * 0.3;
		delays.push(baseDelay * jitter);
	}

	// Normalize so total matches desired duration
	const actualTotal = delays.reduce((a, b) => a + b, 0);
	const scale = totalDurationMs / actualTotal;
	return delays.map((d) => d * scale);
}

/** Track mouse position per page since Playwright doesn't expose it */
const mousePositions = new WeakMap<Page, Point>();

export function getMousePosition(page: Page): Point {
	const existing = mousePositions.get(page);
	if (existing) return existing;
	// Initialize at a random viewport position
	const initial: Point = {
		x: randBetween(200, 800),
		y: randBetween(200, 600),
	};
	mousePositions.set(page, initial);
	return initial;
}

export function setMousePosition(page: Page, pos: Point): void {
	mousePositions.set(page, pos);
}

/** Move mouse along a Bezier curve with ease-in-out timing */
export async function moveMouseHumanly(
	page: Page,
	from: Point,
	to: Point,
	config: HumanizeConfig,
): Promise<void> {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const distance = Math.sqrt(dx * dx + dy * dy);

	// For very short distances, just move directly
	if (distance < 5) {
		await page.mouse.move(to.x, to.y);
		return;
	}

	// Scale step count with distance
	const [minSteps, maxSteps] = config.mouse.curveSteps;
	const stepsBase = Math.round(
		minSteps + (maxSteps - minSteps) * Math.min(distance / 1000, 1),
	);
	const steps = Math.max(5, stepsBase + Math.round(randBetween(-3, 3)));

	// Scale duration with distance
	const [minDur, maxDur] = config.mouse.moveDuration;
	const durationFactor = Math.min(distance / 800, 1);
	const totalDuration =
		randBetween(
			minDur + (maxDur - minDur) * durationFactor * 0.3,
			minDur + (maxDur - minDur) * durationFactor,
		) * config.delays.speedFactor;

	const path = generateBezierPath(from, to, steps);
	const timings = generateTimings(steps, totalDuration);

	for (let i = 1; i < path.length; i++) {
		await page.mouse.move(path[i].x, path[i].y);
		await sleep(timings[i - 1]);
	}
}
