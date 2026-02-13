import { z } from "zod";

// ─── Detail Page Schema ──────────────────────────────────────

export const ingestSellerInfoSchema = z.object({
	name: z.string().nullable(),
	userId: z.string().nullable(),
	type: z.enum(["private", "commercial"]).nullable(),
	activeSince: z.string().nullable(),
	otherAdsCount: z.number().nullable(),
});

export const detailPageSchema = z.object({
	description: z.string(),
	category: z.string().nullable(),
	imageUrls: z.array(z.string()),
	details: z.record(z.string()),
	features: z.array(z.string()),
	latitude: z.number().nullable(),
	longitude: z.number().nullable(),
	viewCount: z.number().nullable(),
	seller: ingestSellerInfoSchema,
	html: z.string().optional(),
});

export type DetailPage = z.infer<typeof detailPageSchema>;

// ─── Listing Schema ───────────────────────────────────────────

export const ingestListingSchema = z.object({
	id: z.string(),
	url: z.string(),
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
	abstractHtml: z.string().nullable().optional(),
	detailPage: detailPageSchema.optional(),
});

export type IngestListing = z.infer<typeof ingestListingSchema>;

export const ingestListingsRequestSchema = z.object({
	city: z.string(),
	listings: z.array(ingestListingSchema),
});

export const ingestListingsResponseSchema = z.object({
	newCount: z.number(),
	updatedCount: z.number(),
	versionCount: z.number(),
	detailSnapshotCount: z.number(),
});

export type IngestListingsRequest = z.infer<typeof ingestListingsRequestSchema>;
export type IngestListingsResponse = z.infer<
	typeof ingestListingsResponseSchema
>;
