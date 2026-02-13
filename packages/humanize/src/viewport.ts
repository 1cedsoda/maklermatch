/**
 * Realistic viewport sizes weighted by actual desktop usage share (de-DE market).
 * Each entry: [width, height, weight]
 */
const VIEWPORTS: [number, number, number][] = [
	[1920, 1080, 0.35],
	[1366, 768, 0.15],
	[1536, 864, 0.12],
	[1440, 900, 0.1],
	[1280, 720, 0.08],
	[2560, 1440, 0.07],
	[1600, 900, 0.05],
	[1280, 800, 0.04],
	[1680, 1050, 0.02],
	[1280, 1024, 0.02],
];

export function randomViewport(): { width: number; height: number } {
	const r = Math.random();
	let cumulative = 0;
	for (const [width, height, weight] of VIEWPORTS) {
		cumulative += weight;
		if (r < cumulative) return { width, height };
	}
	return { width: 1920, height: 1080 };
}
