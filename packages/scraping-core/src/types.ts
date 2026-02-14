import type { Result } from "./result";
import type { BrowserIdentity } from "@scraper/humanize";

export interface ScrapedListing {
	sourceId: string;
	sourceUrl: string;
	source: string;
	title: string;
	description: string;
	price: string | null;
	priceParsed: number | null;
	location: string | null;
	date: string | null;
	dateParsed: string | null;
	imageUrl: string | null;
	imageCount: number;
	isPrivate: boolean;
	tags: string[];
	extra?: Record<string, unknown>;
}

export interface ScrapeOptions {
	location: string;
	identity: BrowserIdentity;
	maxPages?: number;
	headless?: boolean;
}

export interface Scraper {
	readonly source: string;
	scrapePages(options: ScrapeOptions): Promise<Result<string[]>>;
	parseListings(htmlPages: string[]): ScrapedListing[];
}
