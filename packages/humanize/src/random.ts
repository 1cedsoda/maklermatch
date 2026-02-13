/** Uniform random between min and max */
export function randBetween(min: number, max: number): number {
	return min + Math.random() * (max - min);
}

/** Box-Muller transform for normal distribution */
export function normalRandom(mean: number, stdDev: number): number {
	const u1 = Math.random();
	const u2 = Math.random();
	const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
	return mean + z * stdDev;
}

/** Sleep for a given number of milliseconds */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}
