import { Window } from "happy-dom";
import type { Page } from "patchright";
import { Result } from "typescript-result";
import { humanBrowse, humanScroll } from "@scraper/humanize";
import { scrapeListingDetail } from "../extract/listing-detail";
import { extractListings } from "../extract/listings";
import { BrowserClosedError, isTargetClosedError } from "../utils/errors";
import { BASE_URL, shuffle } from "../utils/helpers";
import { logger } from "../utils/logger";
import type { ScrapeHandler, ScrapeResult } from "./scrape-handler";

const log = logger.child({ module: "crawl" });

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
