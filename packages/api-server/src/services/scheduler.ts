import { SocketEvents } from "@scraper/api-types";
import { logger } from "../logger";
import { getActiveQuests, questToKleinanzeigenSearch } from "./quests";
import { getScraperSocket, isScraperRunning } from "../socket/scraper";
import type { searchQuests } from "../db/schema";

const log = logger.child({ module: "scheduler" });

const WAKEFULNESS_START = 7;
const WAKEFULNESS_END = 23;
const BUSY_RETRY_MS = 2 * 60_000 + Math.random() * 3 * 60_000; // 2-5 min

type Quest = typeof searchQuests.$inferSelect;

interface ScheduledQuest {
	quest: Quest;
	nextRunAt: number;
}

let scheduledQuests: ScheduledQuest[] = [];
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

function randomInterval(quest: Quest): number {
	const minMs = quest.minIntervalMinutes * 60_000;
	const maxMs = quest.maxIntervalMinutes * 60_000;
	return minMs + Math.random() * (maxMs - minMs);
}

async function triggerQuest(quest: Quest): Promise<boolean> {
	if (isScraperRunning()) {
		log.info(
			{ questId: quest.id, name: quest.name },
			"Scraper busy, delaying quest",
		);
		return false;
	}

	const socket = getScraperSocket();
	if (!socket) {
		log.warn(
			{ questId: quest.id, name: quest.name },
			"No scraper connected, skipping",
		);
		return false;
	}

	const search = questToKleinanzeigenSearch(quest);
	log.info(
		{ questId: quest.id, name: quest.name, search, maxPages: quest.maxPages },
		"Triggering scrape",
	);

	try {
		const result = await socket
			.timeout(10_000)
			.emitWithAck(SocketEvents.SCRAPER_TRIGGER, {
				kleinanzeigenSearch: search,
				questId: quest.id,
				maxPages: quest.maxPages ?? undefined,
			});

		if ("error" in result) {
			log.warn(
				{ questId: quest.id, error: result.error },
				"Scraper rejected trigger",
			);
			return false;
		}

		log.info(
			{ questId: quest.id, name: quest.name },
			"Scrape triggered successfully",
		);
		return true;
	} catch (err) {
		log.error({ questId: quest.id, err }, "Failed to trigger scraper");
		return false;
	}
}

export function reloadQuests(): void {
	const active = getActiveQuests();
	const existingMap = new Map(scheduledQuests.map((sq) => [sq.quest.id, sq]));
	const now = Date.now();

	scheduledQuests = active.map((quest) => {
		const existing = existingMap.get(quest.id);
		if (existing) {
			return { quest, nextRunAt: existing.nextRunAt };
		}
		const jitter = 60_000 + Math.random() * 240_000;
		return { quest, nextRunAt: now + jitter };
	});

	scheduledQuests.sort((a, b) => a.nextRunAt - b.nextRunAt);
	log.info({ count: scheduledQuests.length }, "Reloaded active quests");

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
		timer = setTimeout(() => reloadQuests(), ms);
		return;
	}

	if (scheduledQuests.length === 0) {
		log.info("No active quests, scheduler idle");
		timer = setTimeout(() => reloadQuests(), 5 * 60_000);
		return;
	}

	const now = Date.now();
	const next = scheduledQuests[0];
	const delay = Math.max(0, next.nextRunAt - now);

	timer = setTimeout(async () => {
		if (running) return;
		running = true;

		try {
			const sq = scheduledQuests.shift()!;
			const triggered = await triggerQuest(sq.quest);

			const freshActive = getActiveQuests();
			const stillActive = freshActive.find((q) => q.id === sq.quest.id);
			if (stillActive) {
				// If scraper was busy, retry sooner instead of full interval
				const nextDelay = triggered
					? randomInterval(stillActive)
					: BUSY_RETRY_MS;
				const nextRun = Date.now() + nextDelay;
				scheduledQuests.push({ quest: stillActive, nextRunAt: nextRun });
				scheduledQuests.sort((a, b) => a.nextRunAt - b.nextRunAt);
				const minutes = Math.round((nextRun - Date.now()) / 60_000);
				log.info(
					{ questId: sq.quest.id, name: sq.quest.name, minutes },
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
	reloadQuests();
}

export function stopScheduler(): void {
	if (timer) {
		clearTimeout(timer);
		timer = null;
	}
	scheduledQuests = [];
	log.info("Scheduler stopped");
}
