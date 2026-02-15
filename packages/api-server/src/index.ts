import { createServer } from "node:http";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { logger } from "./logger";
import { jwtAuth } from "./middleware/jwt-auth";
import authRoutes from "./routes/auth";
import listingsRoutes from "./routes/listings";
import scrapingTasksRoutes from "./routes/scraping-tasks";
import scraperProxyRoutes from "./routes/scraper-proxy";
import targetsRoutes from "./routes/targets";
import sellersRoutes from "./routes/sellers";
import { setupScraperSocket } from "./socket/scraper";
import { startScheduler, stopScheduler } from "./services/scheduler";
import conversationsRoutes from "./routes/conversations";
import brokersRoutes from "./routes/brokers";
import companiesRoutes from "./routes/companies";
import companyPlzRoutes from "./routes/company-plz";
import analyticsRoutes from "./routes/analytics";
import { startSmtpReceiver, stopSmtpReceiver } from "./email/smtp-receiver";
import { startSendScheduler, stopSendScheduler } from "./email/scheduler";
import { closeSender } from "./email/smtp-sender";

const log = logger.child({ module: "server" });

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
	try {
		db.run(sql`SELECT 1`);
		res.json({ status: "ok", db: true });
	} catch {
		res.status(503).json({ status: "error", db: false });
	}
});

// Public auth routes
app.use("/api/auth", authRoutes);

// JWT-protected user routes
app.use("/api/listings", jwtAuth, listingsRoutes);
app.use("/api/scraping-tasks", jwtAuth, scrapingTasksRoutes);
app.use("/api/scraper", jwtAuth, scraperProxyRoutes);
app.use("/api/targets", jwtAuth, targetsRoutes);
app.use("/api/sellers", jwtAuth, sellersRoutes);
app.use("/api/conversations", jwtAuth, conversationsRoutes);
app.use("/api/brokers", jwtAuth, brokersRoutes);
app.use("/api/companies", jwtAuth, companiesRoutes);
app.use("/api/companies/:companyId/plz", jwtAuth, companyPlzRoutes);
app.use("/api/analytics", jwtAuth, analyticsRoutes);

// Validate environment variables
function validateEnv() {
	const missing: string[] = [];

	if (process.env.SMTP_MODE === "relay") {
		for (const v of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]) {
			if (!process.env[v]) missing.push(v);
		}
	}

	if (process.env.SMTP_RECEIVER_PORT || process.env.SMTP_RECEIVER_DOMAIN) {
		if (!process.env.SMTP_DOMAIN) missing.push("SMTP_DOMAIN");
	}

	if (missing.length > 0) {
		log.fatal({ missing }, "Required environment variables are not set");
		process.exit(1);
	}

	if (
		process.env.SMTP_DOMAIN &&
		(!process.env.DKIM_PRIVATE_KEY || !process.env.DKIM_SELECTOR)
	) {
		log.warn(
			"DKIM_PRIVATE_KEY or DKIM_SELECTOR not set — emails will be sent without DKIM signing",
		);
	}
}

validateEnv();

// Run migrations on startup
migrate(db, { migrationsFolder: "./drizzle" });

const server = createServer(app);
const io = new SocketIOServer(server, {
	maxHttpBufferSize: 10e6,
});

setupScraperSocket(io);

server.listen(port, () => {
	log.info(`API server running on port ${port}`);
	startScheduler();

	// Start email subsystem if SMTP is configured
	if (process.env.SMTP_RECEIVER_PORT || process.env.SMTP_RECEIVER_DOMAIN) {
		startSmtpReceiver();
		startSendScheduler();
	}
});

const shutdown = async (signal: string) => {
	log.info({ signal }, "Shutting down");
	stopScheduler();
	stopSendScheduler();
	stopSmtpReceiver();
	closeSender();
	io.close();
	server.close(() => {
		log.info("HTTP server closed");
		process.exit(0);
	});
	// Force exit if server.close hangs
	setTimeout(() => process.exit(1), 5_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
