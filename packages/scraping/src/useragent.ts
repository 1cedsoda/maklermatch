type Platform = "windows" | "mac" | "linux";

function pickWeighted<T>(items: [T, number][]): T {
	const r = Math.random();
	let cumulative = 0;
	for (const [item, weight] of items) {
		cumulative += weight;
		if (r < cumulative) return item;
	}
	return items[items.length - 1][0];
}

function randInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Real Chrome stable release versions sourced from Google's mirror.
// Each entry: [major, build, [patch values seen in the wild]]
const CHROME_RELEASES: [number, number, number[]][] = [
	[118, 5993, [70, 88, 117]],
	[119, 6045, [105, 123, 159, 199]],
	[120, 6099, [62, 71, 109, 129, 199, 216, 224]],
	[121, 6167, [85, 139, 160, 184]],
	[122, 6261, [57, 69, 94, 111, 128]],
	[123, 6312, [58, 86, 105, 122]],
	[124, 6367, [60, 78, 91, 118, 155, 201, 207]],
	[125, 6422, [60, 76, 112, 141]],
	[126, 6478, [55, 61, 114, 126, 182]],
	[127, 6533, [72, 88, 99, 119]],
	[128, 6613, [84, 113, 119, 137]],
	[129, 6668, [58, 70, 89, 100]],
	[130, 6723, [58, 69, 91, 116]],
	[131, 6778, [69, 85, 108, 139, 204, 264]],
	[132, 6834, [83, 110, 159]],
	[133, 6943, [53, 98, 126, 141]],
	[134, 6998, [35, 88, 165]],
	[135, 7049, [52, 84, 95]],
	[136, 7103, [59, 92, 113]],
	[137, 7151, [55, 103, 119]],
	[138, 7204, [100, 157, 168, 183]],
	[139, 7258, [66]],
	[140, 7339, [127, 207]],
	[141, 7390, [54]],
	[142, 7444, [59, 134]],
	[143, 7499, [192]],
	[144, 7559, [111, 133, 134]],
	[145, 7632, [68]],
];

// Weight recent versions more heavily (exponential decay)
const versionWeights: [number, number][] = CHROME_RELEASES.map((_, i) => [
	i,
	Math.pow(1.15, i),
]);

// Approximate real-world desktop platform share (de-DE market)
const platformWeights: [Platform, number][] = [
	["windows", 0.65],
	["mac", 0.25],
	["linux", 0.1],
];

const PLATFORM_STRINGS: Record<Platform, () => string> = {
	windows: () => {
		return `Windows NT 10.0; Win64; x64`;
	},
	mac: () => {
		const r = Math.random();
		if (r < 0.05) return `Macintosh; Intel Mac OS X 10_15_${randInt(0, 7)}`;
		if (r < 0.1)
			return `Macintosh; Intel Mac OS X 11_${randInt(0, 7)}_${randInt(0, 5)}`;
		if (r < 0.15)
			return `Macintosh; Intel Mac OS X 12_${randInt(0, 7)}_${randInt(0, 5)}`;
		if (r < 0.35)
			return `Macintosh; Intel Mac OS X 13_${randInt(0, 6)}_${randInt(0, 3)}`;
		if (r < 0.65)
			return `Macintosh; Intel Mac OS X 14_${randInt(0, 7)}_${randInt(0, 3)}`;
		return `Macintosh; Intel Mac OS X 15_${randInt(0, 3)}_${randInt(0, 2)}`;
	},
	linux: () => {
		return Math.random() < 0.8
			? "X11; Linux x86_64"
			: "X11; Ubuntu; Linux x86_64";
	},
};

export function randomUserAgent(): string {
	const platform = pickWeighted(platformWeights);
	const idx = pickWeighted(versionWeights);
	const [major, build, patches] = CHROME_RELEASES[idx];
	const patch = patches[randInt(0, patches.length - 1)];

	return `Mozilla/5.0 (${PLATFORM_STRINGS[platform]()}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.${build}.${patch} Safari/537.36`;
}
