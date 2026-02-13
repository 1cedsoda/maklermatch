import { z } from "zod";
import { categoryIdSchema } from "../scraper/categories";
import { sortingSchema } from "../scraper/sorting";

// ─── Search Targets ───────────────────────────────────────────

export const searchTargetSchema = z.object({
	id: z.number(),
	name: z.string(),
	active: z.boolean(),
	category: categoryIdSchema,
	location: z.string(),
	sorting: sortingSchema.nullable(),
	isPrivate: z.boolean().nullable(),
	maxPages: z.number().nullable(),
	minIntervalMinutes: z.number(),
	maxIntervalMinutes: z.number(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type SearchTarget = z.infer<typeof searchTargetSchema>;

export const createTargetRequestSchema = z.object({
	name: z.string().min(1),
	category: categoryIdSchema,
	location: z.string().min(1),
	sorting: sortingSchema.optional(),
	isPrivate: z.boolean().optional(),
	maxPages: z.number().int().positive().optional(),
	minIntervalMinutes: z.number().int().min(1).optional(),
	maxIntervalMinutes: z.number().int().min(1).optional(),
});

export type CreateTargetRequest = z.infer<typeof createTargetRequestSchema>;

export const updateTargetRequestSchema = z.object({
	name: z.string().min(1).optional(),
	active: z.boolean().optional(),
	category: categoryIdSchema.optional(),
	location: z.string().min(1).optional(),
	sorting: sortingSchema.optional(),
	isPrivate: z.boolean().optional(),
	maxPages: z.number().int().positive().nullable().optional(),
	minIntervalMinutes: z.number().int().min(1).optional(),
	maxIntervalMinutes: z.number().int().min(1).optional(),
});

export type UpdateTargetRequest = z.infer<typeof updateTargetRequestSchema>;

export const targetsResponseSchema = z.object({
	targets: z.array(searchTargetSchema),
});

export type TargetsResponse = z.infer<typeof targetsResponseSchema>;

// ─── Scraping Tasks ─────────────────────────────────────────

export const logEntrySchema = z.object({
	line: z.string(),
	ts: z.number(),
});

export type LogEntry = z.infer<typeof logEntrySchema>;

export const scrapingTaskSchema = z.object({
	id: z.number(),
	targetId: z.number(),
	startedAt: z.string(),
	status: z.enum(["pending", "success", "error"]),
	maxPages: z.number().nullable(),
	pagesScraped: z.number().nullable(),
	listingsFound: z.number().nullable(),
	detailsScraped: z.number().nullable(),
	detailsFailed: z.number().nullable(),
	errorMessage: z.string().nullable(),
	errorLogs: z.array(logEntrySchema).nullable().optional(),
	targetName: z.string(),
	targetLocation: z.string(),
});

export const scrapingTasksResponseSchema = z.object({
	tasks: z.array(scrapingTaskSchema),
});

export type ScrapingTask = z.infer<typeof scrapingTaskSchema>;
export type ScrapingTasksResponse = z.infer<typeof scrapingTasksResponseSchema>;

export const scrapingTaskDetailResponseSchema = z.object({
	task: scrapingTaskSchema,
	scraperId: z.string().nullable(),
});

export type ScrapingTaskDetailResponse = z.infer<
	typeof scrapingTaskDetailResponseSchema
>;

// ─── Scheduler Status ────────────────────────────────────────

export interface SchedulerEntry {
	targetId: number;
	nextRunAt: number;
}

export interface SchedulerStatusResponse {
	schedule: SchedulerEntry[];
}
