import type { Socket } from "socket.io-client";
import {
	SocketEvents,
	type ServerToScraperEvents,
	type ScraperToServerEvents,
} from "@scraper/api-types";
import type { ApiClient } from "./api-client";
import { executeScrapePass } from "./scrape";
import { sendMessage } from "./message-sender";
import { logger } from "./logger";

const log = logger.child({ module: "socket-handlers" });

type TypedSocket = Socket<ServerToScraperEvents, ScraperToServerEvents>;

const MAX_CONCURRENCY = Number(process.env.SCRAPER_MAX_CONCURRENCY) || 2;

const activeTasks = new Map<number, { startedAt: string }>();
const taskAbortControllers = new Map<number, AbortController>();
let lastRunAt: string | null = null;

function hasCapacity(): boolean {
	return activeTasks.size < MAX_CONCURRENCY;
}

function registerTask(taskId: number, controller: AbortController): void {
	activeTasks.set(taskId, { startedAt: new Date().toISOString() });
	taskAbortControllers.set(taskId, controller);
}

function completeTask(taskId: number): void {
	activeTasks.delete(taskId);
	taskAbortControllers.delete(taskId);
	lastRunAt = new Date().toISOString();
}

export function getActiveTaskIds(): number[] {
	return Array.from(activeTasks.keys());
}

export function getMaxConcurrency(): number {
	return MAX_CONCURRENCY;
}

export function setupScraperHandlers(
	socket: TypedSocket,
	apiClient: ApiClient,
) {
	socket.on(SocketEvents.SCRAPER_STATUS, (ack) => {
		const mem = process.memoryUsage();
		const taskIds = Array.from(activeTasks.keys());
		ack({
			isRunning: activeTasks.size > 0,
			runningTaskCount: activeTasks.size,
			maxConcurrency: MAX_CONCURRENCY,
			activeTasks: taskIds,
			lastRunAt,
			memoryMb: {
				rss: Math.round(mem.rss / 1024 / 1024),
				heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
				heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
			},
		});
	});

	socket.on(SocketEvents.SCRAPER_TRIGGER, (data, ack) => {
		if (!hasCapacity()) {
			ack({ error: "Scraper at max concurrency" });
			return;
		}
		ack({ ok: true });
		const { kleinanzeigenSearch, targetId, maxPages, headless } = data;
		log.info(
			{ search: kleinanzeigenSearch, targetId, maxPages, headless },
			"Scrape triggered by server",
		);

		const controller = new AbortController();
		let capturedTaskId: number | null = null;

		executeScrapePass(apiClient, kleinanzeigenSearch, {
			targetId,
			maxPages,
			headless,
			signal: controller.signal,
			onTaskStarted: (taskId) => {
				capturedTaskId = taskId;
				registerTask(taskId, controller);
			},
		}).finally(() => {
			if (capturedTaskId !== null) {
				completeTask(capturedTaskId);
			}
		});
	});

	socket.on(SocketEvents.SCRAPER_CANCEL_TASK, (data, ack) => {
		const controller = taskAbortControllers.get(data.taskId);
		if (controller) {
			log.info({ taskId: data.taskId }, "Cancel requested for task");
			controller.abort();
			ack({ ok: true });
		} else {
			ack({ error: "Task not found on this scraper" });
		}
	});

	socket.on(SocketEvents.MESSAGE_SEND, async (data, ack) => {
		log.info(
			{ jobId: data.jobId, conversationId: data.conversationId },
			"Message send requested",
		);
		const result = await sendMessage(data);
		ack(result);
	});
}
