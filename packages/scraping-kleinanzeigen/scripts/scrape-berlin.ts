import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { generateIdentity, loadProxies } from "@scraper/humanize";
import type { ScrapedListing } from "@scraper/scraping-core";
import { getCategoryById } from "@scraper/api-types";
import {
	launchBrowser,
	searchViaStartpage,
	dismissCookieBanner,
	navigateToCategory,
	filterPrivateListings,
	setLocation,
	waitForListings,
	scrapeIncrementally,
	type ScrapeHandler,
} from "../src";

const search = {
	category: "208", // Häuser zum Kauf
	location: "Berlin",
	isPrivate: true,
};
const MAX_PAGES = 2;

interface ListingRow {
	id: string;
	city: string;
	url: string;
	firstSeen: string;
	lastSeen: string;
	detailPageScrapedAt: string | null;
}

interface AbstractSnapshotRow {
	listingId: string;
	title: string;
	description: string;
	price: string | null;
	priceParsed: number | null;
	location: string | null;
	distance: string | null;
	date: string | null;
	imageUrl: string | null;
	imageCount: number;
	isPrivate: boolean;
	tags: string[];
	seenAt: string;
}

interface DetailSnapshotRow {
	listingId: string;
	description: string;
	category: string | null;
	imageUrls: string[];
	details: Record<string, string>;
	features: string[];
	latitude: number | null;
	longitude: number | null;
	viewCount: number | null;
	sellerId: string | null;
	seenAt: string;
}

interface SellerRow {
	externalId: string;
	name: string | null;
	type: "private" | "commercial" | null;
	activeSince: string | null;
	otherAdsCount: number | null;
	seenAt: string;
}

function createFileHandler(city: string) {
	const listingMap = new Map<string, ScrapedListing>();
	const listings: ListingRow[] = [];
	const abstractSnapshots: AbstractSnapshotRow[] = [];
	const detailSnapshots: DetailSnapshotRow[] = [];
	const sellers: SellerRow[] = [];
	const seenListingIds = new Set<string>();

	const handler: ScrapeHandler = {
		onListingsDiscovered: async (scraped) => {
			const now = new Date().toISOString();

			for (const l of scraped) {
				listingMap.set(l.sourceId, l);

				if (!seenListingIds.has(l.sourceId)) {
					seenListingIds.add(l.sourceId);
					listings.push({
						id: l.sourceId,
						city,
						url: l.sourceUrl,
						firstSeen: now,
						lastSeen: now,
						detailPageScrapedAt: null,
					});
				}

				abstractSnapshots.push({
					listingId: l.sourceId,
					title: l.title,
					description: l.description,
					price: l.price,
					priceParsed: l.priceParsed,
					location: l.location,
					distance: (l.extra?.distance as string) ?? null,
					date: l.date,
					imageUrl: l.imageUrl,
					imageCount: l.imageCount,
					isPrivate: l.isPrivate,
					tags: l.tags,
					seenAt: now,
				});
			}

			// Request detail visits for all listings
			return { detailNeeded: scraped.map((l) => l.sourceId) };
		},

		onDetailScraped: async (detail) => {
			const now = new Date().toISOString();

			// Update detailPageScrapedAt on the listing row
			const listingRow = listings.find((l) => l.id === detail.id);
			if (listingRow) {
				listingRow.detailPageScrapedAt = now;
			}

			detailSnapshots.push({
				listingId: detail.id,
				description: detail.description,
				category: detail.category,
				imageUrls: detail.imageUrls,
				details: detail.details,
				features: detail.features,
				latitude: detail.latitude,
				longitude: detail.longitude,
				viewCount: detail.viewCount,
				sellerId: detail.seller.userId,
				seenAt: now,
			});

			if (detail.seller.userId) {
				sellers.push({
					externalId: detail.seller.userId,
					name: detail.seller.name,
					type: detail.seller.type,
					activeSince: detail.seller.activeSince,
					otherAdsCount: detail.seller.otherAdsCount,
					seenAt: now,
				});
			}
		},
	};

	function writeResults(outputDir: string) {
		mkdirSync(outputDir, { recursive: true });

		const files = {
			"listings.json": listings,
			"listing_abstract_snapshots.json": abstractSnapshots,
			"listing_detail_snapshots.json": detailSnapshots,
			"sellers.json": sellers,
		};

		for (const [filename, data] of Object.entries(files)) {
			const path = join(outputDir, filename);
			writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
			console.log(`Saved: ${filename} (${(data as unknown[]).length} rows)`);
		}
	}

	return { handler, writeResults };
}

async function main() {
	const city = search.location;
	const maxPages = MAX_PAGES;

	console.log("Starting scrape pass", { city, search, maxPages });

	const proxiesPath = join(
		import.meta.dir,
		"..",
		"..",
		"scraping-server",
		"proxies.txt",
	);
	const identity = await generateIdentity(loadProxies(proxiesPath));
	const { browser, page } = await launchBrowser(identity, { headless: false });

	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const outputDir = join(import.meta.dir, "..", "output", timestamp);

	try {
		// ── Navigation ──
		console.log("Navigating to Kleinanzeigen...");
		const kleinanzeigenPage = await searchViaStartpage(page);
		await dismissCookieBanner(kleinanzeigenPage);
		const categoryInfo = getCategoryById(search.category)!;
		await navigateToCategory(kleinanzeigenPage, categoryInfo);
		if (search.isPrivate) {
			await filterPrivateListings(kleinanzeigenPage);
		}
		await setLocation(kleinanzeigenPage, city);
		await waitForListings(kleinanzeigenPage);

		// ── Incremental scrape ──
		const { handler, writeResults } = createFileHandler(city);
		const result = await scrapeIncrementally(kleinanzeigenPage, handler, {
			maxPages,
		});

		// ── Write output ──
		writeResults(outputDir);
		console.log(
			`\nScrape complete: ${result.pagesScraped} pages, ${result.listingsFound} listings, ${result.detailsScraped} details`,
		);
		console.log(`Output: ${outputDir}`);
	} finally {
		await browser.close();
	}
}

main().catch(console.error);
