import { z } from "zod";

export const triggerSchema = z.object({
	id: z.number(),
	city: z.string(),
	triggeredAt: z.string(),
	status: z.enum(["pending", "success", "error"]),
	pagesScraped: z.number().nullable(),
	listingsFound: z.number().nullable(),
	errorMessage: z.string().nullable(),
});

export const triggersResponseSchema = z.object({
	triggers: z.array(triggerSchema),
});

export type Trigger = z.infer<typeof triggerSchema>;
export type TriggersResponse = z.infer<typeof triggersResponseSchema>;
