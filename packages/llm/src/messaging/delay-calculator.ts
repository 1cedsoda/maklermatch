import {
	AFK_DELAY_MAX,
	AFK_DELAY_MIN,
	AFK_PROBABILITY,
	CHARS_PER_SECOND,
	FIRST_MESSAGE_DELAY_MAX,
	FIRST_MESSAGE_DELAY_MIN,
	ONLINE_DELAY_MAX,
	ONLINE_DELAY_MIN,
} from "./config";

export interface DelayResult {
	delayMs: number;
	reason: string;
}

export class DelayCalculator {
	private active = false;
	private testMode: boolean;

	constructor(opts: { testMode?: boolean } = {}) {
		this.testMode = opts.testMode ?? false;
	}

	calculate(
		messageLength: number,
		isFirstInConversation: boolean,
	): DelayResult {
		let result: DelayResult;

		if (isFirstInConversation) {
			result = {
				delayMs: this.randomBetween(
					FIRST_MESSAGE_DELAY_MIN,
					FIRST_MESSAGE_DELAY_MAX,
				),
				reason: "first_message",
			};
		} else if (!this.active) {
			// Not yet "online" -- similar to first message but shorter
			result = {
				delayMs: this.randomBetween(
					FIRST_MESSAGE_DELAY_MIN,
					FIRST_MESSAGE_DELAY_MAX / 2,
				),
				reason: "not_active",
			};
		} else if (Math.random() < AFK_PROBABILITY) {
			// Occasional "stepped away" pause
			result = {
				delayMs: this.randomBetween(AFK_DELAY_MIN, AFK_DELAY_MAX),
				reason: "afk",
			};
		} else {
			// Online -- fast reply, scaled by message length
			const typingMs = (messageLength / CHARS_PER_SECOND) * 1000;
			const baseDelay = this.randomBetween(ONLINE_DELAY_MIN, ONLINE_DELAY_MAX);
			result = {
				delayMs: Math.round(baseDelay + typingMs * 0.3),
				reason: "online",
			};
		}

		if (this.testMode) {
			return {
				delayMs: 0,
				reason: `${result.reason} (test_mode: ${result.delayMs}ms)`,
			};
		}

		return result;
	}

	markActive(): void {
		this.active = true;
	}

	isActive(): boolean {
		return this.active;
	}

	private randomBetween(min: number, max: number): number {
		return Math.round(min + Math.random() * (max - min));
	}
}
