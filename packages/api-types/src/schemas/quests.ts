import { z } from "zod";

// ─── Search Quests ───────────────────────────────────────────

export const searchQuestSchema = z.object({
	id: z.number(),
	name: z.string(),
	active: z.boolean(),
	category: z.string(),
	location: z.string(),
	isPrivate: z.boolean().nullable(),
	maxPages: z.number().nullable(),
	minIntervalMinutes: z.number(),
	maxIntervalMinutes: z.number(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type SearchQuest = z.infer<typeof searchQuestSchema>;

export const createQuestRequestSchema = z.object({
	name: z.string().min(1),
	category: z.string(),
	location: z.string().min(1),
	isPrivate: z.boolean().optional(),
	maxPages: z.number().int().positive().optional(),
	minIntervalMinutes: z.number().int().min(5).optional(),
	maxIntervalMinutes: z.number().int().min(5).optional(),
});

export type CreateQuestRequest = z.infer<typeof createQuestRequestSchema>;

export const updateQuestRequestSchema = z.object({
	name: z.string().min(1).optional(),
	active: z.boolean().optional(),
	category: z.string().optional(),
	location: z.string().min(1).optional(),
	isPrivate: z.boolean().optional(),
	maxPages: z.number().int().positive().nullable().optional(),
	minIntervalMinutes: z.number().int().min(5).optional(),
	maxIntervalMinutes: z.number().int().min(5).optional(),
});

export type UpdateQuestRequest = z.infer<typeof updateQuestRequestSchema>;

export const questsResponseSchema = z.object({
	quests: z.array(searchQuestSchema),
});

export type QuestsResponse = z.infer<typeof questsResponseSchema>;

// ─── Scraping Tasks ─────────────────────────────────────────

export const scrapingTaskSchema = z.object({
	id: z.number(),
	questId: z.number(),
	startedAt: z.string(),
	status: z.enum(["pending", "success", "error"]),
	maxPages: z.number().nullable(),
	pagesScraped: z.number().nullable(),
	listingsFound: z.number().nullable(),
	detailsScraped: z.number().nullable(),
	detailsFailed: z.number().nullable(),
	errorMessage: z.string().nullable(),
	questName: z.string(),
	questLocation: z.string(),
});

export const scrapingTasksResponseSchema = z.object({
	tasks: z.array(scrapingTaskSchema),
});

export type ScrapingTask = z.infer<typeof scrapingTaskSchema>;
export type ScrapingTasksResponse = z.infer<typeof scrapingTasksResponseSchema>;

// ─── Scheduler Status ────────────────────────────────────────

export interface SchedulerEntry {
	questId: number;
	nextRunAt: number;
}

export interface SchedulerStatusResponse {
	schedule: SchedulerEntry[];
}
