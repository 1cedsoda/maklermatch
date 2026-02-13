import { z } from "zod";

export const createTriggerRequestSchema = z.object({
	city: z.string(),
});

export const createTriggerResponseSchema = z.object({
	id: z.number(),
});

export const updateTriggerRequestSchema = z.object({
	status: z.enum(["pending", "success", "error"]).optional(),
	pagesScraped: z.number().optional(),
	listingsFound: z.number().optional(),
	errorMessage: z.string().optional(),
});

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
});

export const ingestListingsRequestSchema = z.object({
	city: z.string(),
	listings: z.array(ingestListingSchema),
});

export const ingestListingsResponseSchema = z.object({
	newCount: z.number(),
	updatedCount: z.number(),
	versionCount: z.number(),
});

export type CreateTriggerRequest = z.infer<typeof createTriggerRequestSchema>;
export type CreateTriggerResponse = z.infer<typeof createTriggerResponseSchema>;
export type UpdateTriggerRequest = z.infer<typeof updateTriggerRequestSchema>;
export type IngestListing = z.infer<typeof ingestListingSchema>;
export type IngestListingsRequest = z.infer<typeof ingestListingsRequestSchema>;
export type IngestListingsResponse = z.infer<
	typeof ingestListingsResponseSchema
>;
