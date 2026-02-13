import type { BrowserIdentity } from "@scraper/humanize";
import { launchBrowser } from "./browser";
import {
	searchViaStartpage,
	dismissCookieBanner,
	navigateToCategory,
	filterPrivateListings,
	setLocation,
	waitForListings,
} from "./navigation";
import { crawlAllPages, type CrawlResult } from "./crawl";
import { logger } from "./logger";
import type { Result } from "@scraper/scraping-core";

const log = logger.child({ module: "scrape" });

/** Default category: Häuser zum Kauf (c208) */
const DEFAULT_CATEGORY = { slug: "haus-kaufen", id: 208 };

export interface ScrapeOptions {
	category?: { slug: string; id: number };
	location: string;
	identity: BrowserIdentity;
	maxPages?: number;
	headless?: boolean;
}

export async function scrapeListingPages(
	options: ScrapeOptions,
): Promise<Result<CrawlResult>> {
	log.info(
		{
			location: options.location,
			maxPages: options.maxPages ?? "unlimited",
			proxy: options.identity.proxy.server,
		},
		"Starting scrape",
	);

	const { browser, page } = await launchBrowser(options.identity, {
		headless: options.headless,
	});

	try {
		log.info("Step 1/6: Searching via Startpage...");
		const kleinanzeigenPage = await searchViaStartpage(page);

		log.info("Step 2/6: Dismissing cookie banner...");
		await dismissCookieBanner(kleinanzeigenPage);

		log.info("Step 3/6: Navigating to category...");
		await navigateToCategory(
			kleinanzeigenPage,
			options.category ?? DEFAULT_CATEGORY,
		);

		log.info("Step 4/6: Setting location...");
		await setLocation(kleinanzeigenPage, options.location);

		log.info("Step 5/6: Filtering private listings...");
		await filterPrivateListings(kleinanzeigenPage);

		log.info("Step 6/6: Waiting for listings...");
		await waitForListings(kleinanzeigenPage);

		log.info("All navigation steps complete. Starting crawl...");
		const result = await crawlAllPages(kleinanzeigenPage, options.maxPages);
		log.info(
			{
				pageCount: result.pages.length,
				detailCount: result.details.length,
			},
			"Scrape finished successfully",
		);
		return { ok: true, value: result };
	} catch (e) {
		const error = e as Error;
		log.error({ err: error }, "Scrape failed");
		return { ok: false, error };
	} finally {
		log.info("Closing browser...");
		await browser.close();
	}
}
