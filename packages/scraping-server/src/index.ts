import { ApiClient } from "./api-client";
import { KleinanzeigenScraper } from "@scraper/scraping-kleinanzeigen";
import { logger } from "./logger";
import { startScheduler } from "./scheduler";
import { executeScrapePass } from "./scrape";

const log = logger.child({ module: "main" });

const API_SERVER_URL = process.env.API_SERVER_URL || "http://localhost:3001";
const apiClient = new ApiClient(API_SERVER_URL);
const scraper = new KleinanzeigenScraper();

const QUESTS = [{ city: "Berlin" }];

log.info(
	{ quests: QUESTS, apiServer: API_SERVER_URL },
	"Scraping client starting",
);

for (const quest of QUESTS) {
	startScheduler(() => executeScrapePass(scraper, apiClient, quest.city));
}
