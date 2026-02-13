import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { scrapingTasks, searchQuests } from "../db/schema";

const router = Router();

router.get("/", (req, res) => {
	const questIdFilter = req.query.questId
		? Number(req.query.questId)
		: undefined;

	const rows = db
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
		.orderBy(desc(scrapingTasks.startedAt))
		.all();

	const tasks = questIdFilter
		? rows.filter((r) => r.questId === questIdFilter)
		: rows;

	res.json({ tasks });
});

export default router;
