import { io } from "socket.io-client";
import { SCRAPER_SECRET, SocketEvents } from "@scraper/api-types";
import { setLogLineHandler as setKleinanzeigenLogHandler } from "@scraper/scraping-kleinanzeigen";
import { ApiClient } from "./api-client";
import { setupScraperHandlers, getCurrentTaskId } from "./socket-handlers";
import { logger, setLogLineHandler } from "./logger";

const log = logger.child({ module: "main" });

if (process.env.NODE_ENV === "production" && !process.env.API_SERVER_URL) {
	log.fatal("API_SERVER_URL must be set in production");
	process.exit(1);
}

const API_SERVER_URL = process.env.API_SERVER_URL || "http://localhost:3001";

const socket = io(API_SERVER_URL, {
	auth: { secret: SCRAPER_SECRET },
	reconnection: true,
	reconnectionDelay: 1000,
	reconnectionDelayMax: 30000,
});

const emitLogLine = (line: string, ts: number) => {
	socket.volatile.emit(SocketEvents.LOG_LINE, { line, ts });
};
setLogLineHandler(emitLogLine);
setKleinanzeigenLogHandler(emitLogLine);

const apiClient = new ApiClient(socket);

socket.on("connect", () => {
	log.info("Connected to API server, waiting for trigger events");
	socket.emitWithAck(SocketEvents.REGISTER, {
		source: "kleinanzeigen",
		cities: [],
	});
});

socket.on("connect_error", (err) => {
	log.error({ err: err.message }, "Connection to API server failed");
});

socket.on("disconnect", (reason) => {
	log.warn({ reason }, "Disconnected from API server");
});

setupScraperHandlers(socket, apiClient);

log.info(
	{ apiServer: API_SERVER_URL },
	"Scraping client starting (trigger-only mode)",
);

const shutdown = async (signal: string) => {
	log.info({ signal }, "Received shutdown signal");
	const taskId = getCurrentTaskId();
	if (taskId !== null) {
		log.info({ taskId }, "Cancelling running task before exit");
		try {
			await apiClient.scrapeCancel(taskId);
		} catch (err) {
			log.warn({ err }, "Failed to send cancel event");
		}
	}
	socket.disconnect();
	process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
