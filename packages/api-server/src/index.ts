import express from "express";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "./db";
import { logger } from "./logger";
import { jwtAuth } from "./middleware/jwt-auth";
import { secretAuth } from "./middleware/secret-auth";
import authRoutes from "./routes/auth";
import listingsRoutes from "./routes/listings";
import ingestRoutes from "./routes/ingest";
import triggersRoutes from "./routes/triggers";
import scraperProxyRoutes from "./routes/scraper-proxy";

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
app.use("/api/triggers", jwtAuth, triggersRoutes);
app.use("/api/scraper", jwtAuth, scraperProxyRoutes);

// Secret-protected ingestion routes (called by scraping client)
app.use("/api/ingest", secretAuth, ingestRoutes);

// Run migrations on startup
migrate(db, { migrationsFolder: "./drizzle" });

app.listen(port, () => {
	log.info(`API server running on port ${port}`);
});
