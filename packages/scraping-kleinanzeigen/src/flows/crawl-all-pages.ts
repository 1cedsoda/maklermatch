import type { Page } from "patchright";
import {
	humanClick,
	humanDelay,
	humanIdleMouse,
	humanScroll,
	humanScrollToElement,
} from "@scraper/humanize";
import { scrapeListingDetail } from "../extract/listing-detail";
import type { KleinanzeigenListingDetail } from "../extract/listing-detail";
import { BASE_URL } from "../utils/helpers";
import { logger } from "../utils/logger";

const log = logger.child({ module: "crawl" });

export interface CrawlResult {
	pages: string[];
	details: KleinanzeigenListingDetail[];
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
