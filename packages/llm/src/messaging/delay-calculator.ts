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
	testMode: boolean;
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
		let delayMs: number;
		let reason: string;

		if (isFirstInConversation) {
			delayMs = this.randomBetween(
				FIRST_MESSAGE_DELAY_MIN,
				FIRST_MESSAGE_DELAY_MAX,
			);
			reason = "first_message";
		} else if (!this.active) {
			delayMs = this.randomBetween(
				FIRST_MESSAGE_DELAY_MIN,
				FIRST_MESSAGE_DELAY_MAX / 2,
			);
			reason = "not_active";
		} else if (Math.random() < AFK_PROBABILITY) {
			delayMs = this.randomBetween(AFK_DELAY_MIN, AFK_DELAY_MAX);
			reason = "afk";
		} else {
			const typingMs = (messageLength / CHARS_PER_SECOND) * 1000;
			const baseDelay = this.randomBetween(ONLINE_DELAY_MIN, ONLINE_DELAY_MAX);
			delayMs = Math.round(baseDelay + typingMs * 0.3);
			reason = "online";
		}

		return { delayMs, reason, testMode: this.testMode };
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
