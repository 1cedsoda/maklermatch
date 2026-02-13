import { TYPO_PROBABILITY } from "./config";

// Common German typos that look natural (letter swaps in frequent words)
const TYPO_MAP: Record<string, string> = {
	die: "dei",
	und: "udn",
	der: "dre",
	das: "dsa",
	sich: "sich", // intentional no-op, keeps distribution natural
	mit: "mti",
	ist: "ist",
	hab: "ahb",
	mal: "aml",
	was: "wsa",
	wie: "wei",
	bei: "bie",
};

export class PostProcessor {
	process(text: string): string {
		let result = text;
		result = this.fixDashes(result);
		result = this.humanize(result);
		return result;
	}

	/**
	 * Remove ALL dashes used as grammatical/stylistic devices.
	 * - Em-dash (—) and en-dash (–): remove entirely, join surrounding text
	 * - Double dash (--) used as Gedankenstrich: remove, join text
	 * - Preserve hyphens in compound words (Wohn-Ess-Bereich)
	 */
	private fixDashes(text: string): string {
		// Replace em-dash / en-dash surrounded by optional spaces with a comma or period
		// "Das Haus — wirklich toll" → "Das Haus, wirklich toll"
		let result = text.replace(/\s*\u2014\s*/g, ", ");
		result = result.replace(/\s*\u2013\s*/g, ", ");

		// Replace " -- " (Gedankenstrich) with comma+space
		// "Das Haus -- wirklich toll" → "Das Haus, wirklich toll"
		result = result.replace(/\s+--\s+/g, ", ");

		// Clean up double commas or comma after period that might result
		result = result.replace(/,\s*,/g, ",");
		result = result.replace(/\.\s*,/g, ".");

		return result;
	}

	/**
	 * With TYPO_PROBABILITY chance, introduce ONE small human error.
	 * Types of errors:
	 * - Letter swap in a common word
	 * - Missing space after comma
	 */
	private humanize(text: string): string {
		if (Math.random() > TYPO_PROBABILITY) return text;

		if (Math.random() < 0.6) {
			return this.swapLetters(text);
		}
		return this.removeSpaceAfterComma(text);
	}

	private swapLetters(text: string): string {
		const words = Object.keys(TYPO_MAP).filter(
			(w) => TYPO_MAP[w] !== w && text.includes(w),
		);
		if (words.length === 0) return text;

		// Pick one random matching word and replace only the first occurrence
		const word = words[Math.floor(Math.random() * words.length)];
		const idx = text.indexOf(word);
		if (idx === -1) return text;

		return text.slice(0, idx) + TYPO_MAP[word] + text.slice(idx + word.length);
	}

	private removeSpaceAfterComma(text: string): string {
		// Find all ", " positions and pick one to make ", " -> ","
		const positions: number[] = [];
		for (let i = 0; i < text.length - 1; i++) {
			if (text[i] === "," && text[i + 1] === " ") {
				positions.push(i);
			}
		}
		if (positions.length === 0) return text;

		const pos = positions[Math.floor(Math.random() * positions.length)];
		return text.slice(0, pos + 1) + text.slice(pos + 2);
	}
}
