import type { Page } from "patchright";
import { humanBrowse, humanScroll } from "@scraper/humanize";
import { scrapeListingDetail } from "../extract/listing-detail";
import type { KleinanzeigenListingDetail } from "../extract/listing-detail";
import { BASE_URL, shuffle } from "../utils/helpers";
import { logger } from "../utils/logger";

const log = logger.child({ module: "crawl" });

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
