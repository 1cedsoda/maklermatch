import { Server as SocketIOServer, type Socket } from "socket.io";
import {
	SCRAPER_SECRET,
	type ScraperToServerEvents,
	type ServerToScraperEvents,
	SocketEvents,
	registerPayloadSchema,
	scrapeStartPayloadSchema,
	scrapeResultPayloadSchema,
	scrapeErrorPayloadSchema,
	listingCheckPayloadSchema,
	ingestListingsPayloadSchema,
} from "@scraper/api-types";
import {
	createScrapingTask,
	updateScrapingTask,
	getScrapingTask,
	ingestListings,
	checkListings,
	markRemovedListings,
} from "../services/ingest";
import { getQuestById } from "../services/quests";
import { logger } from "../logger";

const log = logger.child({ module: "socket" });

type TypedServer = SocketIOServer<ScraperToServerEvents, ServerToScraperEvents>;
type TypedSocket = Socket<ScraperToServerEvents, ServerToScraperEvents>;

interface ScraperInfo {
	source: string;
	cities: string[];
	socket: TypedSocket;
}

const scrapers = new Map<string, ScraperInfo>();

// ─── Server-side scraper running state ───────────────────────

let currentScrapingTaskId: number | null = null;

export function isScraperRunning(): boolean {
	return currentScrapingTaskId !== null;
}

export function getCurrentScrapingTaskId(): number | null {
	return currentScrapingTaskId;
}

// ─── Public helpers ──────────────────────────────────────────

export function getScraperSocket(): TypedSocket | null {
	const first = scrapers.values().next();
	return first.done ? null : first.value.socket;
}

export function getConnectedScrapers(): {
	id: string;
	source: string;
	cities: string[];
}[] {
	return Array.from(scrapers.entries()).map(([id, info]) => ({
		id,
		source: info.source,
		cities: info.cities,
	}));
}

// ─── Socket setup ────────────────────────────────────────────

export function setupScraperSocket(server: SocketIOServer) {
	const io: TypedServer = server;

	io.use((socket, next) => {
		const secret = socket.handshake.auth.secret;
		if (secret !== SCRAPER_SECRET) {
			return next(new Error("Authentication failed"));
		}
		next();
	});

	io.on("connection", (socket) => {
		log.info({ id: socket.id }, "Scraper connected");

		socket.on("disconnect", (reason) => {
			const info = scrapers.get(socket.id);
			log.info(
				{ id: socket.id, source: info?.source, reason },
				"Scraper disconnected",
			);
			scrapers.delete(socket.id);
			currentScrapingTaskId = null;
		});

		socket.on(SocketEvents.REGISTER, (data, ack) => {
			const parsed = registerPayloadSchema.safeParse(data);
			if (!parsed.success) {
				return;
			}
			scrapers.set(socket.id, {
				source: parsed.data.source,
				cities: parsed.data.cities,
				socket,
			});
			log.info(
				{ source: parsed.data.source, cities: parsed.data.cities },
				"Scraper registered",
			);
			ack({ ok: true });
		});

		socket.on(SocketEvents.SCRAPE_START, (data, ack) => {
			const parsed = scrapeStartPayloadSchema.safeParse(data);
			if (!parsed.success) {
				return;
			}
			const { id } = createScrapingTask(parsed.data.questId, {
				maxPages: parsed.data.maxPages,
			});
			currentScrapingTaskId = id;
			ack({ taskId: id });
		});

		socket.on(SocketEvents.SCRAPE_RESULT, (data, ack) => {
			const parsed = scrapeResultPayloadSchema.safeParse(data);
			if (!parsed.success) {
				return;
			}
			const {
				taskId,
				pagesScraped,
				listingsFound,
				detailsScraped,
				detailsFailed,
				listings,
			} = parsed.data;

			// Look up the task and its quest to get the city
			const task = getScrapingTask(taskId);
			const quest = task ? getQuestById(task.questId) : null;
			const city = quest?.location ?? "";

			const result = ingestListings(city, listings);
			updateScrapingTask(taskId, {
				status: "success",
				pagesScraped,
				listingsFound,
				detailsScraped,
				detailsFailed,
			});

			// Mark removed listings after a full scrape (no maxPages limit)
			if (task && !task.maxPages && city) {
				markRemovedListings(city, task.startedAt);
			}

			currentScrapingTaskId = null;
			ack(result);
		});

		socket.on(SocketEvents.LISTING_CHECK, (data, ack) => {
			const parsed = listingCheckPayloadSchema.safeParse(data);
			if (!parsed.success) {
				return;
			}
			const results = checkListings(parsed.data.listings);
			ack({ results });
		});

		socket.on(SocketEvents.INGEST_LISTINGS, (data, ack) => {
			const parsed = ingestListingsPayloadSchema.safeParse(data);
			if (!parsed.success) {
				return;
			}
			const result = ingestListings(parsed.data.city, parsed.data.listings);
			ack(result);
		});

		socket.on(SocketEvents.SCRAPE_ERROR, (data, ack) => {
			const parsed = scrapeErrorPayloadSchema.safeParse(data);
			if (!parsed.success) {
				return;
			}
			updateScrapingTask(parsed.data.taskId, {
				status: "error",
				errorMessage: parsed.data.errorMessage,
			});
			currentScrapingTaskId = null;
			ack({ ok: true });
		});
	});
}
