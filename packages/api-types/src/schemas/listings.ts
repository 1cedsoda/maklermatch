import { z } from "zod";

export const listingVersionSchema = z.object({
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

export const listingSchema = z.object({
	id: z.string(),
	city: z.string(),
	url: z.string(),
	firstSeen: z.string(),
	lastSeen: z.string(),
});

export const listingWithLatestVersionSchema = listingSchema.extend({
	latestVersion: listingVersionSchema.nullable(),
});

export const listingWithVersionsSchema = listingSchema.extend({
	versions: z.array(listingVersionSchema),
});

export const listingsResponseSchema = z.object({
	listings: z.array(listingWithLatestVersionSchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
});

export type ListingVersion = z.infer<typeof listingVersionSchema>;
export type Listing = z.infer<typeof listingSchema>;
export type ListingWithLatestVersion = z.infer<
	typeof listingWithLatestVersionSchema
>;
export type ListingWithVersions = z.infer<typeof listingWithVersionsSchema>;
export type ListingsResponse = z.infer<typeof listingsResponseSchema>;
