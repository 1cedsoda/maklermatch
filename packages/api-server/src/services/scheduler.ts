import { SocketEvents } from "@scraper/api-types";
import { logger } from "../logger";
import { getActiveTargets, targetToKleinanzeigenSearch } from "./targets";
import { getScraperSocket, isScraperRunning } from "../socket/scraper";
import type { searchTargets } from "../db/schema";

const log = logger.child({ module: "scheduler" });

const WAKEFULNESS_START = 7;
const WAKEFULNESS_END = 23;
const BUSY_RETRY_MS = 2 * 60_000 + Math.random() * 3 * 60_000; // 2-5 min

type Target = typeof searchTargets.$inferSelect;

interface ScheduledTarget {
	target: Target;
	nextRunAt: number;
}

let scheduledTargets: ScheduledTarget[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;

function isAwakeHour(): boolean {
	const hour = new Date().getHours();
	return hour >= WAKEFULNESS_START && hour < WAKEFULNESS_END;
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

function randomInterval(target: Target): number {
	const minMs = target.minIntervalMinutes * 60_000;
	const maxMs = target.maxIntervalMinutes * 60_000;
	return minMs + Math.random() * (maxMs - minMs);
}

async function triggerTarget(target: Target): Promise<boolean> {
	if (isScraperRunning()) {
		log.info(
			{ targetId: target.id, name: target.name },
			"Scraper busy, delaying target",
		);
		return false;
	}

	const socket = getScraperSocket();
	if (!socket) {
		log.warn(
			{ targetId: target.id, name: target.name },
			"No scraper connected, skipping",
		);
		return false;
	}

	const search = targetToKleinanzeigenSearch(target);
	log.info(
		{
			targetId: target.id,
			name: target.name,
			search,
			maxPages: target.maxPages,
		},
		"Triggering scrape",
	);

	try {
		const result = await socket
			.timeout(10_000)
			.emitWithAck(SocketEvents.SCRAPER_TRIGGER, {
				kleinanzeigenSearch: search,
				targetId: target.id,
				maxPages: target.maxPages ?? undefined,
			});

		if ("error" in result) {
			log.warn(
				{ targetId: target.id, error: result.error },
				"Scraper rejected trigger",
			);
			return false;
		}

		log.info(
			{ targetId: target.id, name: target.name },
			"Scrape triggered successfully",
		);
		return true;
	} catch (err) {
		log.error({ targetId: target.id, err }, "Failed to trigger scraper");
		return false;
	}
}

export function reloadTargets(): void {
	const active = getActiveTargets();
	const existingMap = new Map(scheduledTargets.map((st) => [st.target.id, st]));
	const now = Date.now();

	scheduledTargets = active.map((target) => {
		const existing = existingMap.get(target.id);
		if (existing) {
			return { target, nextRunAt: existing.nextRunAt };
		}
		const jitter = 60_000 + Math.random() * 240_000;
		return { target, nextRunAt: now + jitter };
	});

	scheduledTargets.sort((a, b) => a.nextRunAt - b.nextRunAt);
	log.info({ count: scheduledTargets.length }, "Reloaded active targets");

	scheduleNextTick();
}

function scheduleNextTick(): void {
	if (timer) {
		clearTimeout(timer);
		timer = null;
	}

	if (!isAwakeHour()) {
		const ms = msUntilWakefulness();
		const hours = Math.round((ms / 3_600_000) * 10) / 10;
		log.info(
			{ hours, wakeAt: `${WAKEFULNESS_START}:00` },
			"Outside wakefulness hours, sleeping",
		);
		timer = setTimeout(() => reloadTargets(), ms);
		return;
	}

	if (scheduledTargets.length === 0) {
		log.info("No active targets, scheduler idle");
		timer = setTimeout(() => reloadTargets(), 5 * 60_000);
		return;
	}

	const now = Date.now();
	const next = scheduledTargets[0];
	const delay = Math.max(0, next.nextRunAt - now);

	timer = setTimeout(async () => {
		if (running) return;
		running = true;

		try {
			const st = scheduledTargets.shift()!;
			const triggered = await triggerTarget(st.target);

			const freshActive = getActiveTargets();
			const stillActive = freshActive.find((t) => t.id === st.target.id);
			if (stillActive) {
				// If scraper was busy, retry sooner instead of full interval
				const nextDelay = triggered
					? randomInterval(stillActive)
					: BUSY_RETRY_MS;
				const nextRun = Date.now() + nextDelay;
				scheduledTargets.push({ target: stillActive, nextRunAt: nextRun });
				scheduledTargets.sort((a, b) => a.nextRunAt - b.nextRunAt);
				const minutes = Math.round((nextRun - Date.now()) / 60_000);
				log.info(
					{ targetId: st.target.id, name: st.target.name, minutes },
					"Next run scheduled",
				);
			}
		} finally {
			running = false;
			scheduleNextTick();
		}
	}, delay);
}

export function startScheduler(): void {
	log.info("Scheduler starting");
	reloadTargets();
}

export function getSchedulerState(): {
	targetId: number;
	nextRunAt: number;
}[] {
	return scheduledTargets.map((st) => ({
		targetId: st.target.id,
		nextRunAt: st.nextRunAt,
	}));
}

export function stopScheduler(): void {
	if (timer) {
		clearTimeout(timer);
		timer = null;
	}
	scheduledTargets = [];
	log.info("Scheduler stopped");
}
