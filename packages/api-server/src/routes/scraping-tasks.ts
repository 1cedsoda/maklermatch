import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { scrapingTasks, searchTargets } from "../db/schema";
import { getScraperIdForTask } from "../socket/scraper";

const router = Router();

router.get("/", (req, res) => {
	const targetIdFilter = req.query.targetId
		? Number(req.query.targetId)
		: undefined;
	const limit = req.query.limit ? Number(req.query.limit) : undefined;

	let query = db
		.select({
			id: scrapingTasks.id,
			targetId: scrapingTasks.targetId,
			startedAt: scrapingTasks.startedAt,
			status: scrapingTasks.status,
			maxPages: scrapingTasks.maxPages,
			pagesScraped: scrapingTasks.pagesScraped,
			listingsFound: scrapingTasks.listingsFound,
			detailsScraped: scrapingTasks.detailsScraped,
			detailsFailed: scrapingTasks.detailsFailed,
			errorMessage: scrapingTasks.errorMessage,
			targetName: searchTargets.name,
			targetLocation: searchTargets.location,
		})
		.from(scrapingTasks)
		.innerJoin(searchTargets, eq(scrapingTasks.targetId, searchTargets.id))
		.$dynamic();

	if (targetIdFilter) {
		query = query.where(eq(scrapingTasks.targetId, targetIdFilter));
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
			targetId: scrapingTasks.targetId,
			startedAt: scrapingTasks.startedAt,
			status: scrapingTasks.status,
			maxPages: scrapingTasks.maxPages,
			pagesScraped: scrapingTasks.pagesScraped,
			listingsFound: scrapingTasks.listingsFound,
			detailsScraped: scrapingTasks.detailsScraped,
			detailsFailed: scrapingTasks.detailsFailed,
			errorMessage: scrapingTasks.errorMessage,
			errorLogs: scrapingTasks.errorLogs,
			targetName: searchTargets.name,
			targetLocation: searchTargets.location,
		})
		.from(scrapingTasks)
		.innerJoin(searchTargets, eq(scrapingTasks.targetId, searchTargets.id))
		.where(eq(scrapingTasks.id, id))
		.get();

	if (!task) {
		res.status(404).json({ error: "Task not found" });
		return;
	}

	const scraperId =
		task.status === "pending" ? getScraperIdForTask(task.id) : null;

	res.json({ task, scraperId });
});

export default router;
