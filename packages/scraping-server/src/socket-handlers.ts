import type { Socket } from "socket.io-client";
import {
	SocketEvents,
	type ServerToScraperEvents,
	type ScraperToServerEvents,
} from "@scraper/api-types";
import type { ApiClient } from "./api-client";
import { executeScrapePass } from "./scrape";
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
		ack({ isRunning, lastRunAt });
	});

	socket.on(SocketEvents.SCRAPER_TRIGGER, async (data, ack) => {
		if (isRunning) {
			ack({ error: "Scrape already in progress" });
			return;
		}
		ack({ ok: true });
		const { kleinanzeigenSearch, questId, maxPages } = data;
		log.info(
			{ search: kleinanzeigenSearch, questId, maxPages },
			"Scrape triggered by server",
		);
		setRunning();
		try {
			await executeScrapePass(apiClient, kleinanzeigenSearch, {
				questId,
				maxPages,
			});
		} finally {
			setIdle();
		}
	});
}
