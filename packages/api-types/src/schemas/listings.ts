import { z } from "zod";

// ─── Seller Schemas ──────────────────────────────────────────

export const sellerSnapshotSchema = z.object({
	id: z.number(),
	sellerId: z.number(),
	previousSnapshotId: z.number().nullable(),
	name: z.string().nullable(),
	type: z.enum(["private", "commercial"]).nullable(),
	activeSince: z.string().nullable(),
	otherAdsCount: z.number().nullable(),
	seenAt: z.string(),
});

export const sellerSchema = z.object({
	id: z.number(),
	externalId: z.string(),
	firstSeen: z.string(),
	lastSeen: z.string(),
});

export const sellerWithLatestSnapshotSchema = sellerSchema.extend({
	latestSnapshot: sellerSnapshotSchema.nullable(),
});

// ─── Listing Abstract Version ────────────────────────────────

export const listingAbstractSnapshotSchema = z.object({
	id: z.number(),
	listingId: z.string(),
	previousVersionId: z.number().nullable(),
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
	seenAt: z.string(),
});

// ─── Listing Detail Snapshot ─────────────────────────────────

export const listingDetailSnapshotSchema = z.object({
	id: z.number(),
	listingId: z.string(),
	previousSnapshotId: z.number().nullable(),
	description: z.string(),
	category: z.string().nullable(),
	imageUrls: z.array(z.string()),
	details: z.record(z.string()),
	features: z.array(z.string()),
	latitude: z.number().nullable(),
	longitude: z.number().nullable(),
	viewCount: z.number().nullable(),
	sellerId: z.number().nullable(),
	seenAt: z.string(),
});

// ─── Listing Schemas ─────────────────────────────────────────

export const listingSchema = z.object({
	id: z.string(),
	city: z.string(),
	url: z.string(),
	firstSeen: z.string(),
	lastSeen: z.string(),
});

export const listingWithLatestVersionSchema = listingSchema.extend({
	latestVersion: listingAbstractSnapshotSchema.nullable(),
});

export const listingWithVersionsSchema = listingSchema.extend({
	versions: z.array(listingAbstractSnapshotSchema),
	detailSnapshots: z.array(listingDetailSnapshotSchema),
	seller: sellerWithLatestSnapshotSchema.nullable(),
});

export const listingsResponseSchema = z.object({
	listings: z.array(listingWithLatestVersionSchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
});

// ─── Types ───────────────────────────────────────────────────

export type SellerSnapshot = z.infer<typeof sellerSnapshotSchema>;
export type Seller = z.infer<typeof sellerSchema>;
export type SellerWithLatestSnapshot = z.infer<
	typeof sellerWithLatestSnapshotSchema
>;
export type ListingAbstractSnapshot = z.infer<
	typeof listingAbstractSnapshotSchema
>;
export type ListingDetailSnapshot = z.infer<typeof listingDetailSnapshotSchema>;
export type Listing = z.infer<typeof listingSchema>;
export type ListingWithLatestVersion = z.infer<
	typeof listingWithLatestVersionSchema
>;
export type ListingWithVersions = z.infer<typeof listingWithVersionsSchema>;
export type ListingsResponse = z.infer<typeof listingsResponseSchema>;
