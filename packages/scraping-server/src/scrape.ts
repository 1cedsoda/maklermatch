import { join } from "node:path";
import { generateIdentity, loadProxies } from "@scraper/humanize";
import { logger } from "./logger";
import type { ScrapedListing } from "@scraper/scraping-core";
import {
	getCategoryById,
	type IngestListing,
	type ListingCheckResult,
	type KleinanzeigenSearch,
} from "@scraper/api-types";
import {
	launchBrowser,
	searchViaStartpage,
	dismissCookieBanner,
	dismissLoginOverlay,
	navigateToCategory,
	filterPrivateListings,
	selectSorting,
	setLocation,
	waitForListings,
	scrapeIncrementally,
} from "@scraper/scraping-kleinanzeigen";
import type {
	ScrapeHandler,
	KleinanzeigenListingDetail,
} from "@scraper/scraping-kleinanzeigen";
import type { ApiClient } from "./api-client";

const log = logger.child({ module: "scrape" });

const PROXIES_PATH = join(import.meta.dir, "..", "proxies.txt");
const DETAIL_PAGE_STALE_HOURS = 6;

function toIngestListing(
	listing: ScrapedListing,
	detail?: KleinanzeigenListingDetail,
): IngestListing {
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
		dateParsed: listing.dateParsed,
		imageUrl: listing.imageUrl,
		imageCount: listing.imageCount,
		isPrivate: listing.isPrivate,
		tags: listing.tags,
		abstractHtml: (listing.extra?.abstractHtml as string) ?? null,
		detailPage: detail
			? {
					description: detail.description,
					category: detail.category,
					imageUrls: detail.imageUrls,
					details: detail.details,
					features: detail.features,
					latitude: detail.latitude,
					longitude: detail.longitude,
					viewCount: detail.viewCount,
					seller: detail.seller,
					html: detail.html,
				}
			: undefined,
	};
}

function shouldScrapeDetail(check: ListingCheckResult): boolean {
	if (check.status === "new" || check.status === "changed") {
		return true;
	}
	// "unchanged" — only scrape if detail page is stale or never scraped
	if (!check.detailPageLastScraped) {
		return true;
	}
	const lastScraped = new Date(check.detailPageLastScraped).getTime();
	const hoursAgo = (Date.now() - lastScraped) / (1000 * 60 * 60);
	return hoursAgo >= DETAIL_PAGE_STALE_HOURS;
}

function createScrapeHandler(
	apiClient: ApiClient,
	city: string,
): { handler: ScrapeHandler; listingMap: Map<string, ScrapedListing> } {
	const listingMap = new Map<string, ScrapedListing>();

	const handler: ScrapeHandler = {
		onListingsDiscovered: async (listings) => {
			// Store all listings for later use in onDetailScraped
			for (const l of listings) {
				listingMap.set(l.sourceId, l);
			}

			// Check with API server
			const checkItems = listings.map((l) => ({
				id: l.sourceId,
				title: l.title,
				description: l.description,
				price: l.price,
				priceParsed: l.priceParsed,
				location: l.location,
				distance: (l.extra?.distance as string) ?? null,
				date: l.date,
				dateParsed: l.dateParsed,
				imageUrl: l.imageUrl,
				imageCount: l.imageCount,
				isPrivate: l.isPrivate,
				tags: l.tags,
			}));

			const { results: checkResults } = await apiClient.listingCheck(
				city,
				checkItems,
			);

			const detailNeededIds = checkResults
				.filter(shouldScrapeDetail)
				.map((r) => r.id);
			const detailSet = new Set(detailNeededIds);

			// Ingest listings that don't need detail visits immediately
			const noDetailListings = listings.filter(
				(l) => !detailSet.has(l.sourceId),
			);
			if (noDetailListings.length > 0) {
				const ingestItems = noDetailListings.map((l) => toIngestListing(l));
				const result = await apiClient.ingestListings(city, ingestItems);
				log.info(
					{
						ingested: noDetailListings.length,
						new: result.newCount,
						updated: result.updatedCount,
					},
					"Incrementally ingested non-detail listings",
				);
			}

			log.info(
				{
					total: listings.length,
					new: checkResults.filter((r) => r.status === "new").length,
					changed: checkResults.filter((r) => r.status === "changed").length,
					unchanged: checkResults.filter((r) => r.status === "unchanged")
						.length,
					detailNeeded: detailNeededIds.length,
				},
				"Listing check complete",
			);

			return { detailNeeded: detailNeededIds };
		},

		onDetailScraped: async (detail) => {
			const listing = listingMap.get(detail.id);
			if (!listing) {
				log.warn(
					{ detailId: detail.id },
					"Detail scraped for unknown listing, skipping ingestion",
				);
				return;
			}

			const ingestItem = toIngestListing(listing, detail);
			const result = await apiClient.ingestListings(city, [ingestItem]);
			log.info(
				{
					id: detail.id,
					new: result.newCount,
					updated: result.updatedCount,
					detailSnapshots: result.detailSnapshotCount,
				},
				"Incrementally ingested detail listing",
			);
		},
	};

	return { handler, listingMap };
}

export async function executeScrapePass(
	apiClient: ApiClient,
	search: KleinanzeigenSearch,
	opts?: {
		targetId?: number;
		maxPages?: number;
		headless?: boolean;
		onTaskStarted?: (taskId: number) => void;
	},
) {
	const city = search.location;
	const maxPages = opts?.maxPages;
	const targetId = opts?.targetId;
	const headless = opts?.headless;
	log.info(
		{ city, search, targetId, maxPages, headless },
		"Starting scrape pass",
	);

	if (!targetId) {
		throw new Error("targetId is required to start a scraping task");
	}

	const { taskId } = await apiClient.scrapeStart(targetId, { maxPages });
	opts?.onTaskStarted?.(taskId);

	const identity = await generateIdentity(loadProxies(PROXIES_PATH));
	const { browser, page } = await launchBrowser(identity, {
		...(headless !== undefined && { headless }),
	});

	try {
		// ── Navigation ──
		const categoryInfo = getCategoryById(search.category);
		if (!categoryInfo) {
			throw new Error(`Unknown category: ${search.category}`);
		}
		log.info("Navigating to Kleinanzeigen...");
		const kleinanzeigenPage = await searchViaStartpage(page);
		await dismissCookieBanner(kleinanzeigenPage);
		await dismissLoginOverlay(kleinanzeigenPage);
		(await navigateToCategory(kleinanzeigenPage, categoryInfo)).getOrThrow();
		(await setLocation(kleinanzeigenPage, city)).getOrThrow();
		if (search.isPrivate) {
			(await filterPrivateListings(kleinanzeigenPage)).getOrThrow();
		}
		if (search.sorting) {
			(await selectSorting(kleinanzeigenPage, search.sorting)).getOrThrow();
		}
		await waitForListings(kleinanzeigenPage);

		// ── Incremental scrape with callbacks ──
		const { handler } = createScrapeHandler(apiClient, city);
		const result = await scrapeIncrementally(kleinanzeigenPage, handler, {
			maxPages,
		});

		if (!result.ok) {
			// Browser closed mid-scrape — report partial stats + error
			const partial = result.error.partialResult;
			log.warn(
				{ ...partial, cause: result.error.cause },
				"Browser closed during scrape, reporting partial results",
			);
			await apiClient.scrapeResult(
				taskId,
				partial.pagesScraped,
				partial.listingsFound,
				partial.detailsScraped,
				partial.detailsFailed,
				[],
			);
			await apiClient.scrapeError(taskId, result.error.message);
			return;
		}

		// ── Report final stats ──
		const stats = result.value;
		await apiClient.scrapeResult(
			taskId,
			stats.pagesScraped,
			stats.listingsFound,
			stats.detailsScraped,
			stats.detailsFailed,
			[],
		);
		log.info(stats, "Scrape pass completed successfully");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		log.error({ err: error }, "Scrape pass failed");

		await apiClient.scrapeError(taskId, message);
	} finally {
		await browser.close();
	}
}
