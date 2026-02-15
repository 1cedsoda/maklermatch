import type { Page } from "patchright";
import { humanBrowse, humanScroll } from "@scraper/humanize";
import { BASE_URL } from "../utils/helpers";
import { logger } from "../utils/logger";

const log = logger.child({ module: "crawl" });

export interface ListingPageResult {
	pages: string[];
	listingUrls: Map<string, string>; // listingId -> relative URL
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
