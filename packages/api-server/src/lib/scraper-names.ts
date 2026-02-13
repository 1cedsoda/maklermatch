const ADJECTIVES = [
	"Sneaky",
	"Turbo",
	"Caffeinated",
	"Nocturnal",
	"Hyperactive",
	"Stealthy",
	"Quantum",
	"Grumpy",
	"Overclocked",
	"Feral",
	"Unhinged",
	"Suspiciously Fast",
	"Sleep-Deprived",
	"Chaotic",
	"Relentless",
	"Pixelated",
	"Overcaffeinated",
	"Slightly Illegal",
	"Legendary",
	"Budget",
];

const NOUNS = [
	"Raccoon",
	"Goblin",
	"Hamster",
	"Roomba",
	"Intern",
	"Gremlin",
	"Toaster",
	"Pigeon",
	"Capybara",
	"Platypus",
	"Possum",
	"Ferret",
	"Pangolin",
	"Wombat",
	"Axolotl",
	"Narwhal",
	"Tardigrade",
	"Dumpster Diver",
	"Bot 9000",
	"Potato",
];

const usedNames = new Set<string>();

export function generateScraperName(): string {
	// Try random combos first
	for (let i = 0; i < 50; i++) {
		const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
		const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
		const name = `${adj} ${noun}`;
		if (!usedNames.has(name)) {
			usedNames.add(name);
			return name;
		}
	}
	// Fallback: append a number
	const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
	const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
	const name = `${adj} ${noun} #${usedNames.size + 1}`;
	usedNames.add(name);
	return name;
}

export function releaseScraperName(name: string): void {
	usedNames.delete(name);
}
