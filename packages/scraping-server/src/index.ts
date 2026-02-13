import express from "express";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "./db";
import { logger } from "./logger";
import { ensureBerlinQuest } from "./seed";
import { startScheduler } from "./scheduler";
import { executeScrapePass } from "./scrape";

const log = logger.child({ module: "server" });

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

// Run migrations on startup
migrate(db, { migrationsFolder: "./drizzle" });

// Seed the Berlin quest
const quest = ensureBerlinQuest();

// Start the scraping scheduler
startScheduler(() => executeScrapePass(quest.id, quest.city));

app.listen(port, () => {
	log.info(`Scraping server running on port ${port}`);
});
