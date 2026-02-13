import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { scrapingTasks, searchQuests } from "../db/schema";
import {
	getCurrentScrapingTaskId,
	getConnectedScrapers,
} from "../socket/scraper";

const router = Router();

router.get("/", (req, res) => {
	const questIdFilter = req.query.questId
		? Number(req.query.questId)
		: undefined;
	const limit = req.query.limit ? Number(req.query.limit) : undefined;

	let query = db
		.select({
			id: scrapingTasks.id,
			questId: scrapingTasks.questId,
			startedAt: scrapingTasks.startedAt,
			status: scrapingTasks.status,
			maxPages: scrapingTasks.maxPages,
			pagesScraped: scrapingTasks.pagesScraped,
			listingsFound: scrapingTasks.listingsFound,
			detailsScraped: scrapingTasks.detailsScraped,
			detailsFailed: scrapingTasks.detailsFailed,
			errorMessage: scrapingTasks.errorMessage,
			questName: searchQuests.name,
			questLocation: searchQuests.location,
		})
		.from(scrapingTasks)
		.innerJoin(searchQuests, eq(scrapingTasks.questId, searchQuests.id))
		.$dynamic();

	if (questIdFilter) {
		query = query.where(eq(scrapingTasks.questId, questIdFilter));
	}

	query = query.orderBy(desc(scrapingTasks.startedAt));

	if (limit) {
		query = query.limit(limit);
	}

	const tasks = query.all();
	res.json({ tasks });
});

router.get("/:id", (req, res) => {
	const id = Number(req.params.id);
	if (!id) {
		res.status(400).json({ error: "Invalid task ID" });
		return;
	}

	const task = db
		.select({
			id: scrapingTasks.id,
			questId: scrapingTasks.questId,
			startedAt: scrapingTasks.startedAt,
			status: scrapingTasks.status,
			maxPages: scrapingTasks.maxPages,
			pagesScraped: scrapingTasks.pagesScraped,
			listingsFound: scrapingTasks.listingsFound,
			detailsScraped: scrapingTasks.detailsScraped,
			detailsFailed: scrapingTasks.detailsFailed,
			errorMessage: scrapingTasks.errorMessage,
			errorLogs: scrapingTasks.errorLogs,
			questName: searchQuests.name,
			questLocation: searchQuests.location,
		})
		.from(scrapingTasks)
		.innerJoin(searchQuests, eq(scrapingTasks.questId, searchQuests.id))
		.where(eq(scrapingTasks.id, id))
		.get();

	if (!task) {
		res.status(404).json({ error: "Task not found" });
		return;
	}

	let scraperId: string | null = null;
	const currentTaskId = getCurrentScrapingTaskId();
	if (task.status === "pending" && currentTaskId === task.id) {
		const scrapers = getConnectedScrapers();
		if (scrapers.length > 0) {
			scraperId = scrapers[0].id;
		}
	}

	res.json({ task, scraperId });
});

export default router;
