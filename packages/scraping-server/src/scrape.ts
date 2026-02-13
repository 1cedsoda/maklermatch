import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { eq, desc } from "drizzle-orm";
import { Window } from "happy-dom";
import { generateIdentity } from "@scraper/humanize";
import {
	scrapeListingPages,
	extractListings,
	loadProxies,
	type KleinanzeigenListing,
} from "@scraper/scraping";
import { db } from "./db";
import { searchTriggers, listings, listingVersions } from "./db/schema";
import { logger } from "./logger";

const log = logger.child({ module: "scrape" });

const DATA_DIR = process.env.DATA_DIR || "data";

function saveHtmlPages(questId: number, timestamp: string, pages: string[]) {
	const dir = join(DATA_DIR, "search-quests", String(questId), timestamp);
	mkdirSync(dir, { recursive: true });
	for (let i = 0; i < pages.length; i++) {
		writeFileSync(join(dir, `page-${i + 1}.html`), pages[i], "utf-8");
	}
	log.info({ dir, count: pages.length }, "Saved HTML pages");
}

function parseAllListings(pages: string[]): KleinanzeigenListing[] {
	const all: KleinanzeigenListing[] = [];
	for (const html of pages) {
		const window = new Window();
		window.document.body.innerHTML = html;
		const doc = window.document as unknown as Document;
		all.push(...extractListings(doc));
		window.close();
	}
	return all;
}

function hasChanged(
	scraped: KleinanzeigenListing,
	latest: typeof listingVersions.$inferSelect,
): boolean {
	return (
		scraped.title !== latest.title ||
		scraped.description !== latest.description ||
		scraped.price !== latest.price ||
		scraped.priceParsed !== latest.priceParsed ||
		scraped.location !== latest.location ||
		scraped.distance !== latest.distance ||
		scraped.date !== latest.date ||
		scraped.imageUrl !== latest.imageUrl ||
		scraped.imageCount !== latest.imageCount ||
		scraped.isPrivate !== latest.isPrivate ||
		JSON.stringify(scraped.tags) !== JSON.stringify(latest.tags)
	);
}

function insertVersion(
	listingId: string,
	item: KleinanzeigenListing,
	now: string,
	previousVersionId: number | null,
) {
	return db
		.insert(listingVersions)
		.values({
			listingId,
			previousVersionId,
			title: item.title,
			description: item.description,
			price: item.price,
			priceParsed: item.priceParsed,
			location: item.location,
			distance: item.distance,
			date: item.date,
			imageUrl: item.imageUrl,
			imageCount: item.imageCount,
			isPrivate: item.isPrivate,
			tags: item.tags,
			seenAt: now,
		})
		.returning()
		.get();
}

function upsertListings(questId: number, parsed: KleinanzeigenListing[]) {
	const now = new Date().toISOString();
	let newCount = 0;
	let updatedCount = 0;
	let versionCount = 0;

	for (const item of parsed) {
		const existing = db
			.select()
			.from(listings)
			.where(eq(listings.id, item.id))
			.get();

		if (existing) {
			db.update(listings)
				.set({ lastSeen: now })
				.where(eq(listings.id, item.id))
				.run();

			const latestVersion = db
				.select()
				.from(listingVersions)
				.where(eq(listingVersions.listingId, item.id))
				.orderBy(desc(listingVersions.id))
				.limit(1)
				.get();

			if (!latestVersion || hasChanged(item, latestVersion)) {
				insertVersion(item.id, item, now, latestVersion?.id ?? null);
				versionCount++;
			}

			updatedCount++;
		} else {
			db.insert(listings)
				.values({
					id: item.id,
					questId,
					url: item.url,
					firstSeen: now,
					lastSeen: now,
				})
				.run();

			insertVersion(item.id, item, now, null);
			newCount++;
			versionCount++;
		}
	}

	log.info(
		{ new: newCount, updated: updatedCount, versions: versionCount },
		"Upserted listings",
	);
}

export async function executeScrapePass(questId: number, city: string) {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	log.info({ city }, "Starting scrape pass");

	const trigger = db
		.insert(searchTriggers)
		.values({ questId, status: "pending" })
		.returning()
		.get();

	try {
		const identity = await generateIdentity(loadProxies());
		const result = await scrapeListingPages({ location: city, identity });
		if (!result.ok) {
			throw result.error;
		}

		const htmlPages = result.value;
		saveHtmlPages(questId, timestamp, htmlPages);

		const parsed = parseAllListings(htmlPages);
		log.info(
			{ listings: parsed.length, pages: htmlPages.length },
			"Parsed listings",
		);

		upsertListings(questId, parsed);

		db.update(searchTriggers)
			.set({
				status: "success",
				pagesScraped: htmlPages.length,
				listingsFound: parsed.length,
			})
			.where(eq(searchTriggers.id, trigger.id))
			.run();

		log.info("Scrape pass completed successfully");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		log.error({ err: error }, "Scrape pass failed");

		db.update(searchTriggers)
			.set({
				status: "error",
				errorMessage: message,
			})
			.where(eq(searchTriggers.id, trigger.id))
			.run();
	}
}
