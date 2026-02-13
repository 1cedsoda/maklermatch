import { Window } from "happy-dom";
import type {
	Scraper,
	ScrapedListing,
	ScrapeOptions,
} from "@scraper/scraping-core";
import type { Result } from "@scraper/scraping-core";
import { scrapeListingPages } from "./scrape-listing-pages";
import { extractListings } from "./extract-listings";

export class KleinanzeigenScraper implements Scraper {
	readonly source = "kleinanzeigen";

	async scrapePages(options: ScrapeOptions): Promise<Result<string[]>> {
		return scrapeListingPages(options);
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
