import { Window } from "happy-dom";
import type { Page } from "patchright";
import { Result } from "typescript-result";
import {
	humanBrowse,
	humanClick,
	humanDelay,
	humanIdleMouse,
	humanScroll,
	humanScrollToElement,
} from "@scraper/humanize";
import { scrapeListingDetail } from "./extract-listing-detail";
import type { KleinanzeigenListingDetail } from "./extract-listing-detail";
import { extractListings } from "./extract-listings";
import { BrowserClosedError, isTargetClosedError } from "./errors";
import type { ScrapeHandler, ScrapeResult } from "./handler";
import { logger } from "./logger";

const log = logger.child({ module: "crawl" });
const BASE_URL = "https://www.kleinanzeigen.de";

export interface CrawlResult {
	pages: string[];
	details: KleinanzeigenListingDetail[];
}

export interface ListingPageResult {
	pages: string[];
	listingUrls: Map<string, string>; // listingId -> relative URL
}

function shuffle<T>(array: T[]): T[] {
	const a = [...array];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

/**
 * Extract all data-adid values from article.aditem elements currently in the DOM.
 * Returns them in DOM order.
 */
async function getArticleIds(page: Page): Promise<string[]> {
	return page.evaluate(() =>
		Array.from(document.querySelectorAll("article.aditem"))
			.map((a) => a.getAttribute("data-adid"))
			.filter((id): id is string => id !== null && id !== ""),
	);
}

/**
 * Crawl listing pages only — captures HTML and extracts listing IDs + URLs.
 * Does NOT visit detail pages.
 */
export async function crawlListingPages(
	page: Page,
	maxPages?: number,
): Promise<ListingPageResult> {
	const pages: string[] = [];
	const listingUrls = new Map<string, string>();
	log.info(
		{ maxPages: maxPages ?? "unlimited" },
		"Starting listing page crawl...",
	);

	while (true) {
		log.info({ page: pages.length + 1 }, "Capturing HTML...");
		const html = await page.content();
		pages.push(html);
		log.info(
			{ page: pages.length, sizeKB: (html.length / 1024).toFixed(1) },
			"Page captured",
		);

		const articleData = await page.evaluate(() =>
			Array.from(document.querySelectorAll("article.aditem"))
				.map((a) => ({
					id: a.getAttribute("data-adid") || "",
					href: a.getAttribute("data-href") || "",
				}))
				.filter((item) => item.id && item.href),
		);
		for (const { id, href } of articleData) {
			listingUrls.set(id, href);
		}
		log.info(
			{ count: articleData.length, page: pages.length },
			"Found listings on page",
		);

		if (maxPages && pages.length >= maxPages) {
			log.info({ maxPages }, "Reached maxPages limit");
			break;
		}

		const nextUrl = await page.evaluate(() => {
			const el = document.querySelector<HTMLAnchorElement>("a.pagination-next");
			return el?.getAttribute("href") || null;
		});

		if (!nextUrl) {
			log.info("No next page link found, stopping");
			break;
		}

		const fullUrl = `${BASE_URL}${nextUrl}`;
		log.info(
			{ page: pages.length, nextUrl: fullUrl },
			"Navigating to next page...",
		);
		await humanBrowse(page);
		await page.goto(fullUrl, { waitUntil: "domcontentloaded" });
		log.info({ url: page.url() }, "Landed on next page");
		log.info("Waiting for listings table on next page...");
		await page.waitForSelector("#srchrslt-adtable");
		await humanScroll(page);
	}

	log.info(
		{ totalPages: pages.length, totalListings: listingUrls.size },
		"Listing page crawl complete",
	);
	return { pages, listingUrls };
}

/**
 * Visit specific detail pages by direct URL navigation.
 * No goBack needed — navigates directly to each URL.
 */
export async function visitDetailPagesByUrl(
	page: Page,
	urls: { id: string; url: string }[],
): Promise<KleinanzeigenListingDetail[]> {
	const shuffled = shuffle(urls);
	const details: KleinanzeigenListingDetail[] = [];

	for (let i = 0; i < shuffled.length; i++) {
		const { url } = shuffled[i];
		const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
		log.info(
			{ index: i + 1, total: shuffled.length, url: fullUrl },
			"Visiting detail page...",
		);

		try {
			await humanBrowse(page);
			await page.goto(fullUrl, { waitUntil: "domcontentloaded" });
			log.info({ url: page.url() }, "Landed on detail page");
			await page.waitForSelector("#viewad-title", { timeout: 15000 });
			await humanScroll(page);

			const detail = await scrapeListingDetail(page);
			details.push(detail);
			log.info(
				{ index: i + 1, id: detail.id, title: detail.title },
				"Detail extracted",
			);
		} catch (err) {
			log.warn({ url: fullUrl, err }, "Failed to visit detail page, skipping");
		}
	}

	log.info(
		{ visited: details.length, total: shuffled.length },
		"Detail page visits complete",
	);
	return details;
}

function parsePageListings(html: string) {
	const window = new Window();
	window.document.body.innerHTML = html;
	const doc = window.document as unknown as Document;
	const listings = extractListings(doc);
	window.close();
	return listings.map((l) => ({
		sourceId: l.id,
		sourceUrl: l.url,
		source: "kleinanzeigen" as const,
		title: l.title,
		description: l.description,
		price: l.price,
		priceParsed: l.priceParsed,
		location: l.location,
		date: l.date,
		dateParsed: l.dateParsed,
		imageUrl: l.imageUrl,
		imageCount: l.imageCount,
		isPrivate: l.isPrivate,
		tags: l.tags,
		extra: { distance: l.distance, abstractHtml: l.html },
	}));
}

/**
 * Incrementally crawl listing pages and visit detail pages using handler callbacks.
 * After each listing page: parses listings, calls handler.onListingsDiscovered.
 * After each detail page: calls handler.onDetailScraped.
 */
export async function scrapeIncrementally(
	page: Page,
	handler: ScrapeHandler,
	options?: { maxPages?: number },
): Promise<Result<ScrapeResult, BrowserClosedError>> {
	let pagesScraped = 0;
	let listingsFound = 0;
	let detailsScraped = 0;
	let detailsFailed = 0;
	let nextUrl: string | null = null;

	log.info(
		{ maxPages: options?.maxPages ?? "unlimited" },
		"Starting incremental scrape...",
	);

	while (true) {
		try {
			pagesScraped++;
			log.info({ page: pagesScraped }, "Capturing HTML...");
			const html = await page.content();
			log.info(
				{ page: pagesScraped, sizeKB: (html.length / 1024).toFixed(1) },
				"Page captured",
			);

			// Extract listing URLs from DOM (for detail page navigation)
			const articleData = await page.evaluate(() =>
				Array.from(document.querySelectorAll("article.aditem"))
					.map((a) => ({
						id: a.getAttribute("data-adid") || "",
						href: a.getAttribute("data-href") || "",
					}))
					.filter((item) => item.id && item.href),
			);
			const urlMap = new Map(articleData.map(({ id, href }) => [id, href]));

			// Grab next page URL before navigating away to detail pages
			nextUrl = await page.evaluate(() => {
				const el =
					document.querySelector<HTMLAnchorElement>("a.pagination-next");
				return el?.getAttribute("href") || null;
			});

			// Parse listings from HTML
			const parsed = parsePageListings(html);
			listingsFound += parsed.length;
			log.info(
				{ count: parsed.length, page: pagesScraped },
				"Parsed listings from page",
			);

			// Call handler — ingests non-detail listings, returns IDs needing details
			const { detailNeeded } = await handler.onListingsDiscovered(parsed);
			const detailSet = new Set(detailNeeded);
			const pageDetailQueue: { id: string; url: string }[] = [];
			for (const [id, href] of urlMap) {
				if (detailSet.has(id)) {
					pageDetailQueue.push({ id, url: href });
				}
			}
			log.info(
				{ detailQueued: pageDetailQueue.length, page: pagesScraped },
				"Detail queue for page",
			);

			// Visit detail pages for this listing page
			if (pageDetailQueue.length > 0) {
				const shuffled = shuffle(pageDetailQueue);
				for (let i = 0; i < shuffled.length; i++) {
					const { url } = shuffled[i];
					const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
					log.info(
						{ index: i + 1, total: shuffled.length, url: fullUrl },
						"Visiting detail page...",
					);

					try {
						await humanBrowse(page);
						await page.goto(fullUrl, { waitUntil: "domcontentloaded" });
						log.info({ url: page.url() }, "Landed on detail page");
						await page.waitForSelector("#viewad-title", {
							timeout: 15000,
						});
						await humanScroll(page);

						const detail = await scrapeListingDetail(page);
						await handler.onDetailScraped(detail);
						detailsScraped++;
						log.info(
							{ index: i + 1, id: detail.id, title: detail.title },
							"Detail extracted and ingested",
						);
					} catch (err) {
						if (isTargetClosedError(err)) {
							throw err;
						}
						detailsFailed++;
						log.warn(
							{ url: fullUrl, err },
							"Failed to visit detail page, skipping",
						);
					}
				}
			}

			if (options?.maxPages && pagesScraped >= options.maxPages) {
				log.info({ maxPages: options.maxPages }, "Reached maxPages limit");
				break;
			}

			if (!nextUrl) {
				log.info("No next page link found, stopping");
				break;
			}

			const fullNextUrl = `${BASE_URL}${nextUrl}`;
			log.info(
				{ page: pagesScraped, nextUrl: fullNextUrl },
				"Navigating to next page...",
			);
			await humanBrowse(page);
			await page.goto(fullNextUrl, { waitUntil: "domcontentloaded" });
			log.info({ url: page.url() }, "Landed on next page");
			await page.waitForSelector("#srchrslt-adtable");
			await humanScroll(page);
		} catch (err) {
			if (isTargetClosedError(err)) {
				log.warn(
					{ pagesScraped, listingsFound, detailsScraped, detailsFailed },
					"Browser closed unexpectedly, returning partial results",
				);
				return Result.error(
					new BrowserClosedError(
						{
							pagesScraped,
							listingsFound,
							detailsScraped,
							detailsFailed,
						},
						err instanceof Error ? err : new Error(String(err)),
					),
				);
			}
			throw err;
		}
	}

	log.info(
		{
			pagesScraped,
			listingsFound,
			detailsScraped,
			detailsFailed,
		},
		"Incremental scrape complete",
	);

	return Result.ok({
		pagesScraped,
		listingsFound,
		detailsScraped,
		detailsFailed,
	});
}

/**
 * Go back to the listing page after visiting a detail page.
 * Falls back to direct navigation if goBack doesn't land on the listing page.
 */
async function goBackToListingPage(
	page: Page,
	listingPageUrl: string,
): Promise<void> {
	try {
		await humanDelay(page, 300);
		await page.goBack({ waitUntil: "domcontentloaded" });
		log.info({ url: page.url() }, "Landed after goBack");
		await page.waitForSelector("#srchrslt-adtable", { timeout: 10000 });
	} catch {
		log.warn(
			{ url: listingPageUrl },
			"goBack failed, navigating directly to listing page",
		);
		await page.goto(listingPageUrl, { waitUntil: "domcontentloaded" });
		log.info({ url: page.url() }, "Landed after fallback navigation");
		await page.waitForSelector("#srchrslt-adtable", { timeout: 15000 });
	}
}

/**
 * Click a listing article by its ad ID, extract detail data, and go back.
 * Returns the extracted detail, or null if extraction failed.
 */
async function visitDetailViaClick(
	page: Page,
	adId: string,
	listingPageUrl: string,
): Promise<KleinanzeigenListingDetail | null> {
	const articleLocator = page.locator(`article.aditem[data-adid="${adId}"]`);

	log.info({ adId }, "Clicking listing...");

	try {
		await humanScrollToElement(page, articleLocator);
		await humanDelay(page, 500);
		await humanClick(page, articleLocator);
		await page.waitForSelector("#viewad-title", { timeout: 15000 });
		await humanScroll(page);

		const detail = await scrapeListingDetail(page);
		log.info({ adId, id: detail.id, title: detail.title }, "Detail extracted");
		return detail;
	} catch (err) {
		log.warn({ adId, err }, "Failed to extract detail, skipping");
		return null;
	} finally {
		await goBackToListingPage(page, listingPageUrl);
	}
}

/**
 * Crawl all pages by clicking each listing, extracting detail, and going back.
 */
export async function crawlAllPages(
	page: Page,
	maxPages?: number,
): Promise<CrawlResult> {
	const pages: string[] = [];
	const details: KleinanzeigenListingDetail[] = [];

	log.info(
		{ maxPages: maxPages ?? "unlimited" },
		"Starting click-based crawl...",
	);

	let pageNum = 0;

	while (true) {
		pageNum++;
		const listingPageUrl = page.url();

		log.info({ page: pageNum }, "Capturing HTML...");
		const html = await page.content();
		pages.push(html);
		log.info(
			{ page: pageNum, sizeKB: (html.length / 1024).toFixed(1) },
			"Page captured",
		);

		// Build the initial set of article IDs on this page
		const initialIds = await getArticleIds(page);
		log.info(
			{ count: initialIds.length, page: pageNum },
			"Found listings on page",
		);

		let pageScrapedCount = 0;

		if (initialIds.length === 0) {
			log.warn({ page: pageNum }, "No articles found on page, skipping");
		} else {
			const scrapedIds = new Set<string>();
			const maxIterations = initialIds.length * 2;
			let iterations = 0;

			// Interval for periodic longer pauses (every ~4 listings)
			const idlePauseInterval = Math.round(3 + Math.random() * 3);

			while (iterations < maxIterations) {
				iterations++;

				// Re-read current article IDs from DOM (may have changed after goBack)
				const currentIds = await getArticleIds(page);

				if (currentIds.length === 0) {
					log.warn(
						{ page: pageNum, iterations },
						"All articles vanished from DOM, stopping page",
					);
					break;
				}

				// Find the first article that we have not yet scraped
				const nextId = currentIds.find((id) => !scrapedIds.has(id));
				if (!nextId) {
					log.info(
						{ scraped: scrapedIds.size, page: pageNum },
						"All visible articles scraped",
					);
					break;
				}

				// Log new articles for diagnostics
				if (iterations > 1) {
					const previousKnown = new Set([...scrapedIds, ...initialIds]);
					const newIds = currentIds.filter((id) => !previousKnown.has(id));
					if (newIds.length > 0) {
						log.info(
							{ newIds, count: newIds.length },
							"New articles appeared in DOM",
						);
					}
				}

				// Occasional longer pause — simulates user thinking / pausing
				if (
					pageScrapedCount > 0 &&
					pageScrapedCount % idlePauseInterval === 0
				) {
					await humanIdleMouse(page, {
						movements: Math.round(1 + Math.random() * 2),
					});
					await humanDelay(page, 1000 + Math.random() * 2000);
				}

				const detail = await visitDetailViaClick(page, nextId, listingPageUrl);
				scrapedIds.add(nextId);
				pageScrapedCount++;

				if (detail) {
					details.push(detail);
				}
			}

			if (iterations >= maxIterations) {
				log.warn(
					{
						maxIterations,
						scraped: scrapedIds.size,
						page: pageNum,
					},
					"Reached safety iteration limit, moving on",
				);
			}
		}

		log.info(
			{
				page: pageNum,
				detailsOnPage: pageScrapedCount,
				totalDetails: details.length,
			},
			"Page complete",
		);

		if (maxPages && pageNum >= maxPages) {
			log.info({ maxPages }, "Reached maxPages limit");
			break;
		}

		const nextUrl = await page.evaluate(() => {
			const el = document.querySelector<HTMLAnchorElement>("a.pagination-next");
			return el?.getAttribute("href") || null;
		});

		if (!nextUrl) {
			log.info("No next page link found, stopping");
			break;
		}

		const fullUrl = `${BASE_URL}${nextUrl}`;
		log.info({ page: pageNum, nextUrl: fullUrl }, "Navigating to next page...");
		await humanDelay(page, 500 + Math.random() * 1000);
		await page.goto(fullUrl, { waitUntil: "domcontentloaded" });
		log.info({ url: page.url() }, "Landed on next page");
		await page.waitForSelector("#srchrslt-adtable");
	}

	log.info(
		{ totalPages: pages.length, totalDetails: details.length },
		"Click-based crawl complete",
	);

	return { pages, details };
}
