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

let isRunning = false;
let lastRunAt: string | null = null;

export function setRunning() {
	isRunning = true;
}

export function setIdle() {
	isRunning = false;
	lastRunAt = new Date().toISOString();
}

export function setupScraperHandlers(
	socket: TypedSocket,
	apiClient: ApiClient,
) {
	socket.on(SocketEvents.SCRAPER_STATUS, (ack) => {
		const mem = process.memoryUsage();
		ack({
			isRunning,
			lastRunAt,
			memoryMb: {
				rss: Math.round(mem.rss / 1024 / 1024),
				heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
				heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
			},
		});
	});

	socket.on(SocketEvents.SCRAPER_TRIGGER, async (data, ack) => {
		if (isRunning) {
			ack({ error: "Scrape already in progress" });
			return;
		}
		ack({ ok: true });
		const { kleinanzeigenSearch, questId, maxPages, headless } = data;
		log.info(
			{ search: kleinanzeigenSearch, questId, maxPages, headless },
			"Scrape triggered by server",
		);
		setRunning();
		try {
			await executeScrapePass(apiClient, kleinanzeigenSearch, {
				questId,
				maxPages,
				headless,
			});
		} finally {
			setIdle();
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
