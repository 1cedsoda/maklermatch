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
	scrapeCancelPayloadSchema,
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
	runningTasks: Set<number>;
	maxConcurrency: number;
}

const scrapers = new Map<string, ScraperInfo>();

// ─── Public helpers ──────────────────────────────────────────

export function hasAvailableScraper(): boolean {
	for (const info of scrapers.values()) {
		if (info.runningTasks.size < info.maxConcurrency) return true;
	}
	return false;
}

export function getAvailableScraperSocket(): TypedSocket | null {
	for (const info of scrapers.values()) {
		if (info.runningTasks.size < info.maxConcurrency) return info.socket;
	}
	return null;
}

export function getScraperSocket(scraperId?: string): TypedSocket | null {
	if (scraperId) {
		const info = scrapers.get(scraperId);
		return info?.socket ?? null;
	}
	const first = scrapers.values().next();
	return first.done ? null : first.value.socket;
}

export function getAllRunningTaskIds(): number[] {
	const ids: number[] = [];
	for (const info of scrapers.values()) {
		for (const id of info.runningTasks) ids.push(id);
	}
	return ids;
}

export function getScraperIdForTask(taskId: number): string | null {
	for (const [id, info] of scrapers.entries()) {
		if (info.runningTasks.has(taskId)) return id;
	}
	return null;
}

export function getCurrentScrapingTaskId(): number | null {
	for (const info of scrapers.values()) {
		const first = info.runningTasks.values().next();
		if (!first.done) return first.value;
	}
	return null;
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

			const orphanedTasks = info ? Array.from(info.runningTasks) : [];
			scrapers.delete(socket.id);

			if (orphanedTasks.length > 0) {
				log.info(
					{ taskIds: orphanedTasks },
					"Scraper disconnected with running tasks, waiting 10s before marking cancelled",
				);
				setTimeout(() => {
					for (const taskId of orphanedTasks) {
						const task = getScrapingTask(taskId);
						if (task && task.status === "pending") {
							log.info(
								{ taskId },
								"Task still pending after grace period, marking as cancelled",
							);
							const errorLogs = getLogLines(socket.id);
							updateScrapingTask(taskId, {
								status: "cancelled",
								errorLogs,
							});
						}
					}
				}, 10_000);
			}
		});

		socket.on(SocketEvents.REGISTER, (data, ack) => {
			const parsed = registerPayloadSchema.safeParse(data);
			if (!parsed.success) {
				log.warn(
					{ event: SocketEvents.REGISTER, errors: parsed.error.issues },
					"Invalid socket payload",
				);
				return;
			}
			const name = generateScraperName();
			scrapers.set(socket.id, {
				source: parsed.data.source,
				cities: parsed.data.cities,
				name,
				socket,
				runningTasks: new Set(),
				maxConcurrency: parsed.data.maxConcurrency ?? 1,
			});
			log.info(
				{
					name,
					source: parsed.data.source,
					cities: parsed.data.cities,
					maxConcurrency: parsed.data.maxConcurrency ?? 1,
				},
				"Scraper registered",
			);
			ack({ ok: true });
		});

		socket.on(SocketEvents.SCRAPE_START, (data, ack) => {
			const parsed = scrapeStartPayloadSchema.safeParse(data);
			if (!parsed.success) {
				log.warn(
					{ event: SocketEvents.SCRAPE_START, errors: parsed.error.issues },
					"Invalid socket payload",
				);
				return;
			}
			const { id } = createScrapingTask(parsed.data.targetId, {
				maxPages: parsed.data.maxPages,
			});
			const info = scrapers.get(socket.id);
			if (info) info.runningTasks.add(id);
			ack({ taskId: id });
		});

		socket.on(SocketEvents.SCRAPE_RESULT, (data, ack) => {
			const parsed = scrapeResultPayloadSchema.safeParse(data);
			if (!parsed.success) {
				log.warn(
					{ event: SocketEvents.SCRAPE_RESULT, errors: parsed.error.issues },
					"Invalid socket payload",
				);
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

			const info = scrapers.get(socket.id);
			if (info) info.runningTasks.delete(taskId);
			ack(result);
		});

		socket.on(SocketEvents.LISTING_CHECK, (data, ack) => {
			const parsed = listingCheckPayloadSchema.safeParse(data);
			if (!parsed.success) {
				log.warn(
					{ event: SocketEvents.LISTING_CHECK, errors: parsed.error.issues },
					"Invalid socket payload",
				);
				return;
			}
			const results = checkListings(parsed.data.listings);
			ack({ results });
		});

		socket.on(SocketEvents.INGEST_LISTINGS, (data, ack) => {
			const parsed = ingestListingsPayloadSchema.safeParse(data);
			if (!parsed.success) {
				log.warn(
					{ event: SocketEvents.INGEST_LISTINGS, errors: parsed.error.issues },
					"Invalid socket payload",
				);
				return;
			}
			const result = ingestListings(
				parsed.data.city,
				parsed.data.listings,
				parsed.data.taskId ?? null,
			);
			ack(result);
		});

		socket.on(SocketEvents.LOG_LINE, (data) => {
			const parsed = logLinePayloadSchema.safeParse(data);
			if (!parsed.success) {
				log.warn(
					{ event: SocketEvents.LOG_LINE, errors: parsed.error.issues },
					"Invalid socket payload",
				);
				return;
			}
			pushLogLine(
				socket.id,
				parsed.data.line,
				parsed.data.ts,
				parsed.data.taskId,
			);
		});

		socket.on(SocketEvents.SCRAPE_ERROR, (data, ack) => {
			const parsed = scrapeErrorPayloadSchema.safeParse(data);
			if (!parsed.success) {
				log.warn(
					{ event: SocketEvents.SCRAPE_ERROR, errors: parsed.error.issues },
					"Invalid socket payload",
				);
				return;
			}
			const errorLogs = getLogLines(socket.id);
			updateScrapingTask(parsed.data.taskId, {
				status: "error",
				errorMessage: parsed.data.errorMessage,
				errorLogs,
			});
			const info = scrapers.get(socket.id);
			if (info) info.runningTasks.delete(parsed.data.taskId);
			ack({ ok: true });
		});

		socket.on(SocketEvents.SCRAPE_CANCEL, (data, ack) => {
			const parsed = scrapeCancelPayloadSchema.safeParse(data);
			if (!parsed.success) {
				log.warn(
					{ event: SocketEvents.SCRAPE_CANCEL, errors: parsed.error.issues },
					"Invalid socket payload",
				);
				return;
			}
			const errorLogs = getLogLines(socket.id);
			updateScrapingTask(parsed.data.taskId, {
				status: "cancelled",
				errorLogs,
			});
			log.info({ taskId: parsed.data.taskId }, "Task cancelled by scraper");
			const info = scrapers.get(socket.id);
			if (info) info.runningTasks.delete(parsed.data.taskId);
			ack({ ok: true });
		});
	});
}
