import {
	BUSINESS_HOURS_END,
	BUSINESS_HOURS_START,
	CHAT_WINDOW_END_HOUR,
	CHAT_WINDOW_START_HOUR,
	CHAT_WINDOW_START_MINUTE,
	OFF_HOURS_DELAY_MULTIPLIER_MAX,
	OFF_HOURS_DELAY_MULTIPLIER_MIN,
	OFF_HOURS_SKIP_PROBABILITY,
	WEEKEND_DELAY_MULTIPLIER_MAX,
	WEEKEND_DELAY_MULTIPLIER_MIN,
	WEEKEND_SKIP_PROBABILITY,
} from "./config";

export enum TimePeriod {
	BUSINESS_HOURS = "business_hours",
	OFF_HOURS = "off_hours",
	WEEKEND = "weekend",
	OUTSIDE_CHAT_WINDOW = "outside_chat_window",
}

export interface TimeAdjustment {
	period: TimePeriod;
	delayMultiplier: number;
	shouldSkip: boolean;
}

export class TimeWindow {
	classify(now = new Date()): TimePeriod {
		const hour = now.getHours();
		const minute = now.getMinutes();
		const day = now.getDay(); // 0=Sun, 6=Sat

		if (!this.isInChatWindow(now)) {
			return TimePeriod.OUTSIDE_CHAT_WINDOW;
		}

		if (day === 0 || day === 6) {
			return TimePeriod.WEEKEND;
		}

		const timeMinutes = hour * 60 + minute;
		const businessStart = BUSINESS_HOURS_START * 60;
		const businessEnd = BUSINESS_HOURS_END * 60;

		if (timeMinutes >= businessStart && timeMinutes < businessEnd) {
			return TimePeriod.BUSINESS_HOURS;
		}

		return TimePeriod.OFF_HOURS;
	}

	isInChatWindow(now = new Date()): boolean {
		const hour = now.getHours();
		const minute = now.getMinutes();
		const timeMinutes = hour * 60 + minute;
		const windowStart = CHAT_WINDOW_START_HOUR * 60 + CHAT_WINDOW_START_MINUTE;
		// CHAT_WINDOW_END_HOUR=24 means end of day (midnight)
		const windowEnd = CHAT_WINDOW_END_HOUR * 60;

		return timeMinutes >= windowStart && timeMinutes < windowEnd;
	}

	getNextChatWindowStart(from = new Date()): Date {
		const next = new Date(from);

		if (this.isInChatWindow(from)) {
			return from;
		}

		const timeMinutes = from.getHours() * 60 + from.getMinutes();
		const windowStart = CHAT_WINDOW_START_HOUR * 60 + CHAT_WINDOW_START_MINUTE;

		if (timeMinutes < windowStart) {
			// Before today's window — same day
			next.setHours(CHAT_WINDOW_START_HOUR, CHAT_WINDOW_START_MINUTE, 0, 0);
		} else {
			// After today's window (>= midnight) — next day
			next.setDate(next.getDate() + 1);
			next.setHours(CHAT_WINDOW_START_HOUR, CHAT_WINDOW_START_MINUTE, 0, 0);
		}

		return next;
	}

	adjustDelay(
		baseDelayMs: number,
		now = new Date(),
	): { delayMs: number; skipped: boolean; period: TimePeriod } {
		const period = this.classify(now);

		switch (period) {
			case TimePeriod.OUTSIDE_CHAT_WINDOW: {
				const nextStart = this.getNextChatWindowStart(now);
				const waitUntilWindow = nextStart.getTime() - now.getTime();
				return {
					delayMs: Math.round(waitUntilWindow + baseDelayMs),
					skipped: false,
					period,
				};
			}

			case TimePeriod.WEEKEND: {
				if (Math.random() < WEEKEND_SKIP_PROBABILITY) {
					return { delayMs: 0, skipped: true, period };
				}
				const multiplier = this.randomBetween(
					WEEKEND_DELAY_MULTIPLIER_MIN,
					WEEKEND_DELAY_MULTIPLIER_MAX,
				);
				return {
					delayMs: Math.round(baseDelayMs * multiplier),
					skipped: false,
					period,
				};
			}

			case TimePeriod.OFF_HOURS: {
				if (Math.random() < OFF_HOURS_SKIP_PROBABILITY) {
					return { delayMs: 0, skipped: true, period };
				}
				const multiplier = this.randomBetween(
					OFF_HOURS_DELAY_MULTIPLIER_MIN,
					OFF_HOURS_DELAY_MULTIPLIER_MAX,
				);
				return {
					delayMs: Math.round(baseDelayMs * multiplier),
					skipped: false,
					period,
				};
			}

			case TimePeriod.BUSINESS_HOURS:
			default:
				return { delayMs: baseDelayMs, skipped: false, period };
		}
	}

	private randomBetween(min: number, max: number): number {
		return min + Math.random() * (max - min);
	}
}
