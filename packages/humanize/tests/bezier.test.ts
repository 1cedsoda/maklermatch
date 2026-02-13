import { describe, expect, test } from "bun:test";
import {
	cubicBezier,
	generateControlPoints,
	generateBezierPath,
} from "../src/bezier";

describe("cubicBezier", () => {
	const p0 = { x: 0, y: 0 };
	const p1 = { x: 0, y: 100 };
	const p2 = { x: 100, y: 100 };
	const p3 = { x: 100, y: 0 };

	test("returns start point at t=0", () => {
		const result = cubicBezier(p0, p1, p2, p3, 0);
		expect(result.x).toBeCloseTo(0);
		expect(result.y).toBeCloseTo(0);
	});

	test("returns end point at t=1", () => {
		const result = cubicBezier(p0, p1, p2, p3, 1);
		expect(result.x).toBeCloseTo(100);
		expect(result.y).toBeCloseTo(0);
	});

	test("returns midpoint approximately at t=0.5", () => {
		const result = cubicBezier(p0, p1, p2, p3, 0.5);
		expect(result.x).toBeCloseTo(50);
		expect(result.y).toBeCloseTo(75);
	});

	test("straight line when control points are collinear", () => {
		const start = { x: 0, y: 0 };
		const end = { x: 100, y: 100 };
		const cp1 = { x: 33, y: 33 };
		const cp2 = { x: 66, y: 66 };

		const mid = cubicBezier(start, cp1, cp2, end, 0.5);
		expect(mid.x).toBeCloseTo(50, 0);
		expect(mid.y).toBeCloseTo(50, 0);
	});
});

describe("generateControlPoints", () => {
	test("returns two control points", () => {
		const { p1, p2 } = generateControlPoints(
			{ x: 0, y: 0 },
			{ x: 100, y: 100 },
		);
		expect(p1).toHaveProperty("x");
		expect(p1).toHaveProperty("y");
		expect(p2).toHaveProperty("x");
		expect(p2).toHaveProperty("y");
	});

	test("handles zero distance gracefully", () => {
		const { p1, p2 } = generateControlPoints(
			{ x: 50, y: 50 },
			{ x: 50, y: 50 },
		);
		expect(p1.x).toBeCloseTo(50);
		expect(p1.y).toBeCloseTo(50);
		expect(p2.x).toBeCloseTo(50);
		expect(p2.y).toBeCloseTo(50);
	});

	test("control points are not identical across calls (randomized)", () => {
		const start = { x: 0, y: 0 };
		const end = { x: 500, y: 500 };
		const results = Array.from({ length: 10 }, () =>
			generateControlPoints(start, end),
		);

		// At least some should differ
		const uniqueP1x = new Set(results.map((r) => r.p1.x.toFixed(2)));
		expect(uniqueP1x.size).toBeGreaterThan(1);
	});
});

describe("generateBezierPath", () => {
	test("returns correct number of points", () => {
		const path = generateBezierPath({ x: 0, y: 0 }, { x: 100, y: 100 }, 20);
		expect(path).toHaveLength(21); // steps + 1
	});

	test("starts at from point", () => {
		const path = generateBezierPath({ x: 10, y: 20 }, { x: 100, y: 200 }, 30);
		expect(path[0].x).toBeCloseTo(10);
		expect(path[0].y).toBeCloseTo(20);
	});

	test("ends at to point", () => {
		const path = generateBezierPath({ x: 10, y: 20 }, { x: 100, y: 200 }, 30);
		const last = path[path.length - 1];
		expect(last.x).toBeCloseTo(100);
		expect(last.y).toBeCloseTo(200);
	});

	test("all points have finite coordinates", () => {
		const path = generateBezierPath({ x: 0, y: 0 }, { x: 800, y: 600 }, 50);
		for (const p of path) {
			expect(Number.isFinite(p.x)).toBe(true);
			expect(Number.isFinite(p.y)).toBe(true);
		}
	});
});
