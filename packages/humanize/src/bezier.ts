import type { Point } from "./types";
import { randBetween } from "./random";

/** Evaluate cubic Bezier at parameter t (0..1) */
export function cubicBezier(
	p0: Point,
	p1: Point,
	p2: Point,
	p3: Point,
	t: number,
): Point {
	const mt = 1 - t;
	const mt2 = mt * mt;
	const t2 = t * t;
	return {
		x:
			mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
		y:
			mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
	};
}

/**
 * Generate two control points for a cubic Bezier curve between start and end.
 * Creates organic, randomized curves that mimic human hand movement.
 */
export function generateControlPoints(
	start: Point,
	end: Point,
): { p1: Point; p2: Point } {
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const dist = Math.sqrt(dx * dx + dy * dy);

	if (dist < 1) {
		return { p1: { ...start }, p2: { ...end } };
	}

	// Perpendicular unit vector
	const perpX = -dy / dist;
	const perpY = dx / dist;

	// Random curvature: 10-35% of total distance, random direction
	const spread1 =
		dist * randBetween(0.1, 0.35) * (Math.random() < 0.5 ? 1 : -1);
	const spread2 =
		dist * randBetween(0.1, 0.35) * (Math.random() < 0.5 ? 1 : -1);

	// Position along the line: P1 at ~30%, P2 at ~70%, with jitter
	const t1 = randBetween(0.2, 0.4);
	const t2 = randBetween(0.6, 0.8);

	return {
		p1: {
			x: start.x + dx * t1 + perpX * spread1,
			y: start.y + dy * t1 + perpY * spread1,
		},
		p2: {
			x: start.x + dx * t2 + perpX * spread2,
			y: start.y + dy * t2 + perpY * spread2,
		},
	};
}

/**
 * Generate a path of points along a randomized cubic Bezier curve.
 * Steps scale with distance for consistent visual density.
 */
export function generateBezierPath(
	from: Point,
	to: Point,
	steps: number,
): Point[] {
	const { p1, p2 } = generateControlPoints(from, to);
	const path: Point[] = [];
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		path.push(cubicBezier(from, p1, p2, to, t));
	}
	return path;
}
