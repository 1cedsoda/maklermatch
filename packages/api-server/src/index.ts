import { createServer } from "node:http";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "./db";
import { logger } from "./logger";
import { jwtAuth } from "./middleware/jwt-auth";
import authRoutes from "./routes/auth";
import listingsRoutes from "./routes/listings";
import scrapingTasksRoutes from "./routes/scraping-tasks";
import scraperProxyRoutes from "./routes/scraper-proxy";
import questsRoutes from "./routes/quests";
import sellersRoutes from "./routes/sellers";
import { setupScraperSocket } from "./socket/scraper";
import { startScheduler } from "./services/scheduler";

const log = logger.child({ module: "server" });

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

// Public auth routes
app.use("/api/auth", authRoutes);

// JWT-protected user routes
app.use("/api/listings", jwtAuth, listingsRoutes);
app.use("/api/scraping-tasks", jwtAuth, scrapingTasksRoutes);
app.use("/api/scraper", jwtAuth, scraperProxyRoutes);
app.use("/api/quests", jwtAuth, questsRoutes);
app.use("/api/sellers", jwtAuth, sellersRoutes);

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
});
