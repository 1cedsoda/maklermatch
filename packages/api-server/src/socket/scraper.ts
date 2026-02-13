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
	logLinePayloadSchema,
} from "@scraper/api-types";
import {
	createScrapingTask,
	updateScrapingTask,
	getScrapingTask,
	ingestListings,
	checkListings,
	markRemovedListings,
} from "../services/ingest";
import { pushLogLine, getLogLines } from "../services/log-buffer";
import { getTargetById } from "../services/targets";
import { logger } from "../logger";
import { generateScraperName, releaseScraperName } from "../lib/scraper-names";

const log = logger.child({ module: "socket" });

type TypedServer = SocketIOServer<ScraperToServerEvents, ServerToScraperEvents>;
type TypedSocket = Socket<ScraperToServerEvents, ServerToScraperEvents>;

interface ScraperInfo {
	source: string;
	cities: string[];
	name: string;
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
	name: string;
}[] {
	return Array.from(scrapers.entries()).map(([id, info]) => ({
		id,
		name: info.name,
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
			if (info) releaseScraperName(info.name);
			log.info(
				{ id: socket.id, name: info?.name, source: info?.source, reason },
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
			const name = generateScraperName();
			scrapers.set(socket.id, {
				source: parsed.data.source,
				cities: parsed.data.cities,
				name,
				socket,
			});
			log.info(
				{ name, source: parsed.data.source, cities: parsed.data.cities },
				"Scraper registered",
			);
			ack({ ok: true });
		});

		socket.on(SocketEvents.SCRAPE_START, (data, ack) => {
			const parsed = scrapeStartPayloadSchema.safeParse(data);
			if (!parsed.success) {
				return;
			}
			const { id } = createScrapingTask(parsed.data.targetId, {
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

			// Look up the task and its target to get the city
			const task = getScrapingTask(taskId);
			const target = task ? getTargetById(task.targetId) : null;
			const city = target?.location ?? "";

			const result = ingestListings(city, listings, taskId);
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
			const result = ingestListings(
				parsed.data.city,
				parsed.data.listings,
				currentScrapingTaskId,
			);
			ack(result);
		});

		socket.on(SocketEvents.LOG_LINE, (data) => {
			const parsed = logLinePayloadSchema.safeParse(data);
			if (!parsed.success) return;
			pushLogLine(socket.id, parsed.data.line, parsed.data.ts);
		});

		socket.on(SocketEvents.SCRAPE_ERROR, (data, ack) => {
			const parsed = scrapeErrorPayloadSchema.safeParse(data);
			if (!parsed.success) {
				return;
			}
			const errorLogs = getLogLines(socket.id);
			updateScrapingTask(parsed.data.taskId, {
				status: "error",
				errorMessage: parsed.data.errorMessage,
				errorLogs,
			});
			currentScrapingTaskId = null;
			ack({ ok: true });
		});
	});
}
