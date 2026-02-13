import { z } from "zod";
import { ingestListingSchema } from "./ingest";

// ─── Registration ─────────────────────────────────────────────

export const registerPayloadSchema = z.object({
	source: z.string(),
	cities: z.array(z.string()),
});

export type RegisterPayload = z.infer<typeof registerPayloadSchema>;

// ─── Scrape Lifecycle ─────────────────────────────────────────

export const scrapeStartPayloadSchema = z.object({
	questId: z.number(),
	maxPages: z.number().int().positive().optional(),
});

export type ScrapeStartPayload = z.infer<typeof scrapeStartPayloadSchema>;

export const scrapeStartAckSchema = z.object({
	taskId: z.number(),
});

export type ScrapeStartAck = z.infer<typeof scrapeStartAckSchema>;

export const scrapeResultPayloadSchema = z.object({
	taskId: z.number(),
	pagesScraped: z.number(),
	listingsFound: z.number(),
	detailsScraped: z.number(),
	detailsFailed: z.number(),
	listings: z.array(ingestListingSchema),
});

export type ScrapeResultPayload = z.infer<typeof scrapeResultPayloadSchema>;

export const scrapeResultAckSchema = z.object({
	newCount: z.number(),
	updatedCount: z.number(),
	versionCount: z.number(),
	detailSnapshotCount: z.number(),
});

export type ScrapeResultAck = z.infer<typeof scrapeResultAckSchema>;

export const scrapeErrorPayloadSchema = z.object({
	taskId: z.number(),
	errorMessage: z.string(),
});

export type ScrapeErrorPayload = z.infer<typeof scrapeErrorPayloadSchema>;

// ─── Listing Check ───────────────────────────────────────────

export const listingCheckItemSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string(),
	price: z.string().nullable(),
	priceParsed: z.number().nullable(),
	location: z.string().nullable(),
	distance: z.string().nullable(),
	date: z.string().nullable(),
	imageUrl: z.string().nullable(),
	imageCount: z.number(),
	isPrivate: z.boolean(),
	tags: z.array(z.string()),
});

export type ListingCheckItem = z.infer<typeof listingCheckItemSchema>;

export const listingCheckPayloadSchema = z.object({
	city: z.string(),
	listings: z.array(listingCheckItemSchema),
});

export type ListingCheckPayload = z.infer<typeof listingCheckPayloadSchema>;

export const listingCheckResultSchema = z.object({
	id: z.string(),
	status: z.enum(["new", "changed", "unchanged"]),
	detailPageLastScraped: z.string().nullable(),
});

export type ListingCheckResult = z.infer<typeof listingCheckResultSchema>;

export const listingCheckAckSchema = z.object({
	results: z.array(listingCheckResultSchema),
});

export type ListingCheckAck = z.infer<typeof listingCheckAckSchema>;

// ─── Incremental Ingestion ────────────────────────────────────

export const ingestListingsPayloadSchema = z.object({
	city: z.string(),
	listings: z.array(ingestListingSchema),
});

export type IngestListingsPayload = z.infer<typeof ingestListingsPayloadSchema>;

export const ingestListingsAckSchema = z.object({
	newCount: z.number(),
	updatedCount: z.number(),
	versionCount: z.number(),
	detailSnapshotCount: z.number(),
});

export type IngestListingsAck = z.infer<typeof ingestListingsAckSchema>;

// ─── Log Streaming ───────────────────────────────────────────

export const logLinePayloadSchema = z.object({
	line: z.string(),
	ts: z.number(),
});

export type LogLinePayload = z.infer<typeof logLinePayloadSchema>;

// ─── Server → Scraper ─────────────────────────────────────────

export const hausZumKaufSearchSchema = z.object({
	category: z.literal("haus-zum-kauf"),
	location: z.string(),
	isPrivate: z.boolean().optional(),
});

export type HausZumKaufSearch = z.infer<typeof hausZumKaufSearchSchema>;

export const kleinanzeigenSearchSchema = z.discriminatedUnion("category", [
	hausZumKaufSearchSchema,
]);

export type KleinanzeigenSearch = z.infer<typeof kleinanzeigenSearchSchema>;

export const scraperTriggerPayloadSchema = z.object({
	kleinanzeigenSearch: kleinanzeigenSearchSchema,
	questId: z.number().optional(),
	maxPages: z.number().int().positive().optional(),
});

export type ScraperTriggerPayload = z.infer<typeof scraperTriggerPayloadSchema>;
