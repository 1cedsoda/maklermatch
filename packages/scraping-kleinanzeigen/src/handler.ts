import type { ScrapedListing } from "@scraper/scraping-core";
import type { KleinanzeigenListingDetail } from "./extract-listing-detail";

export interface ScrapeHandler {
	/**
	 * Called after each listing page is parsed with the listings from that page.
	 * Implementation should ingest listings that don't need detail page visits.
	 * Returns IDs of listings that need detail page visits.
	 */
	onListingsDiscovered(listings: ScrapedListing[]): Promise<{
		detailNeeded: string[];
	}>;

	/**
	 * Called after each detail page is scraped.
	 * Implementation should ingest the listing with its detail + seller data.
	 */
	onDetailScraped(detail: KleinanzeigenListingDetail): Promise<void>;
}

export interface ScrapeResult {
	pagesScraped: number;
	listingsFound: number;
	detailsScraped: number;
	detailsFailed: number;
}
