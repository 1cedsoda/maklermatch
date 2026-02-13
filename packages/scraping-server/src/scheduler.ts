import { logger } from "./logger";

const log = logger.child({ module: "scheduler" });

const WAKEFULNESS_START = 7;
const WAKEFULNESS_END = 23;
const MIN_INTERVAL_MS = 30 * 60 * 1000;
const MAX_INTERVAL_MS = 60 * 60 * 1000;

function isAwakeHour(): boolean {
	const hour = new Date().getHours();
	return hour >= WAKEFULNESS_START && hour < WAKEFULNESS_END;
}

function randomInterval(): number {
	return MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
}

function msUntilWakefulness(): number {
	const now = new Date();
	const wake = new Date(now);
	wake.setHours(WAKEFULNESS_START, 0, 0, 0);
	if (wake <= now) {
		wake.setDate(wake.getDate() + 1);
	}
	return wake.getTime() - now.getTime();
}

export function startScheduler(task: () => Promise<void>) {
	async function scheduleNext() {
		if (isAwakeHour()) {
			await task();
			const interval = randomInterval();
			const minutes = Math.round(interval / 60000);
			log.info({ minutes }, "Next scrape scheduled");
			setTimeout(scheduleNext, interval);
		} else {
			const ms = msUntilWakefulness();
			const hours = Math.round((ms / 3600000) * 10) / 10;
			log.info(
				{ hours, wakeAt: `${WAKEFULNESS_START}:00` },
				"Outside wakefulness hours, sleeping",
			);
			setTimeout(scheduleNext, ms);
		}
	}

	scheduleNext();
}
