import { Window } from "happy-dom";
import type {
	Scraper,
	ScrapedListing,
	ScrapeOptions,
} from "@scraper/scraping-core";
import type { Result } from "@scraper/scraping-core";
import { scrapeListingPages } from "./scrape-listing-pages";
import { extractListings } from "./extract-listings";
import type { CrawlResult } from "./crawl";

export class KleinanzeigenScraper implements Scraper {
	readonly source = "kleinanzeigen";

	async scrapeWithDetails(
		options: ScrapeOptions,
	): Promise<Result<CrawlResult>> {
		return scrapeListingPages(options);
	}

	async scrapePages(options: ScrapeOptions): Promise<Result<string[]>> {
		const result = await this.scrapeWithDetails(options);
		if (!result.ok) return result;
		return { ok: true, value: result.value.pages };
	}

	parseListings(htmlPages: string[]): ScrapedListing[] {
		const all: ScrapedListing[] = [];
		for (const html of htmlPages) {
			const window = new Window();
			window.document.body.innerHTML = html;
			const doc = window.document as unknown as Document;
			const listings = extractListings(doc);
			all.push(
				...listings.map((l) => ({
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
					extra: { distance: l.distance },
				})),
			);
			window.close();
		}
		return all;
	}
}
