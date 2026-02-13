import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateIdentity, loadProxies } from "@scraper/humanize";
import { logger } from "./logger";
import type { Scraper, ScrapedListing } from "@scraper/scraping-core";
import type { IngestListing } from "@scraper/api-types";
import type { ApiClient } from "./api-client";

const log = logger.child({ module: "scrape" });

const DATA_DIR = process.env.DATA_DIR || "data";
const PROXIES_PATH = join(import.meta.dir, "..", "proxies.txt");

function toIngestListing(listing: ScrapedListing): IngestListing {
	return {
		id: listing.sourceId,
		url: listing.sourceUrl,
		title: listing.title,
		description: listing.description,
		price: listing.price,
		priceParsed: listing.priceParsed,
		location: listing.location,
		distance: (listing.extra?.distance as string) ?? null,
		date: listing.date,
		imageUrl: listing.imageUrl,
		imageCount: listing.imageCount,
		isPrivate: listing.isPrivate,
		tags: listing.tags,
	};
}

function saveHtmlPages(city: string, timestamp: string, pages: string[]) {
	const dir = join(DATA_DIR, city, timestamp);
	mkdirSync(dir, { recursive: true });
	for (let i = 0; i < pages.length; i++) {
		writeFileSync(join(dir, `page-${i + 1}.html`), pages[i], "utf-8");
	}
	log.info({ dir, count: pages.length }, "Saved HTML pages");
}

export async function executeScrapePass(
	scraper: Scraper,
	apiClient: ApiClient,
	city: string,
) {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	log.info({ city, source: scraper.source }, "Starting scrape pass");

	const { id: triggerId } = await apiClient.createTrigger({ city });

	try {
		const identity = await generateIdentity(loadProxies(PROXIES_PATH));
		const result = await scraper.scrapePages({ location: city, identity });
		if (!result.ok) {
			throw result.error;
		}

		const htmlPages = result.value;
		saveHtmlPages(city, timestamp, htmlPages);

		const parsed = scraper.parseListings(htmlPages);
		log.info(
			{ listings: parsed.length, pages: htmlPages.length },
			"Parsed listings",
		);

		const ingestResult = await apiClient.ingestListings({
			city,
			listings: parsed.map(toIngestListing),
		});
		log.info(ingestResult, "Ingested listings via API");

		await apiClient.updateTrigger(triggerId, {
			status: "success",
			pagesScraped: htmlPages.length,
			listingsFound: parsed.length,
		});

		log.info("Scrape pass completed successfully");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		log.error({ err: error }, "Scrape pass failed");

		await apiClient.updateTrigger(triggerId, {
			status: "error",
			errorMessage: message,
		});
	}
}
