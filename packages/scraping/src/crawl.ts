import type { Page } from "patchright";
import { humanBrowse, humanScroll } from "@scraper/humanize";
import { logger } from "./logger";

const log = logger.child({ module: "crawl" });
const BASE_URL = "https://www.kleinanzeigen.de";

export async function crawlAllPages(
	page: Page,
	maxPages?: number,
): Promise<string[]> {
	const pages: string[] = [];
	log.info({ maxPages: maxPages ?? "unlimited" }, "Starting crawl...");

	while (true) {
		log.info({ page: pages.length + 1 }, "Capturing HTML...");
		const html = await page.content();
		pages.push(html);
		log.info(
			{ page: pages.length, sizeKB: (html.length / 1024).toFixed(1) },
			"Page captured",
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
		log.info("Waiting for listings table on next page...");
		await page.waitForSelector("#srchrslt-adtable");
		await humanScroll(page);
	}

	log.info({ totalPages: pages.length }, "Crawl complete");
	return pages;
}
