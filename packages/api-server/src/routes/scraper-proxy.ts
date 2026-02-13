import { Router } from "express";
import { SocketEvents } from "@scraper/api-types";
import {
	getScraperSocket,
	getConnectedScrapers,
	getCurrentScrapingTaskId,
} from "../socket/scraper";
import { getQuestById, questToKleinanzeigenSearch } from "../services/quests";
import { getScrapingTask } from "../services/ingest";
import { getLogLines, getAllLogLines } from "../services/log-buffer";

const router = Router();

router.get("/status", async (_req, res) => {
	const socket = getScraperSocket();
	if (!socket) {
		res.status(502).json({
			error: "Scraping server not connected",
			scrapers: [],
		});
		return;
	}
	try {
		const scraperStatus = await socket
			.timeout(5000)
			.emitWithAck(SocketEvents.SCRAPER_STATUS);

		// Augment with current task info from server state
		let currentTask: {
			id: number;
			questId: number;
			questName: string;
			questLocation: string;
		} | null = null;
		const taskId = getCurrentScrapingTaskId();
		if (taskId) {
			const task = getScrapingTask(taskId);
			if (task) {
				const quest = getQuestById(task.questId);
				if (quest) {
					currentTask = {
						id: taskId,
						questId: quest.id,
						questName: quest.name,
						questLocation: quest.location,
					};
				}
			}
		}

		res.json({
			...scraperStatus,
			currentTask,
			scrapers: getConnectedScrapers(),
		});
	} catch {
		res.status(504).json({ error: "Scraping server did not respond" });
	}
});

router.post("/start", async (req, res) => {
	const questId = Number(req.body.questId);
	if (!questId) {
		res.status(400).json({ error: "questId is required" });
		return;
	}

	const quest = getQuestById(questId);
	if (!quest) {
		res.status(404).json({ error: "Quest not found" });
		return;
	}

	const socket = getScraperSocket();
	if (!socket) {
		res.status(502).json({ error: "Scraping server not connected" });
		return;
	}

	try {
		const result = await socket
			.timeout(5000)
			.emitWithAck(SocketEvents.SCRAPER_TRIGGER, {
				kleinanzeigenSearch: questToKleinanzeigenSearch(quest),
				questId,
				maxPages: req.body.maxPages ?? quest.maxPages ?? undefined,
			});
		res.json(result);
	} catch {
		res.status(504).json({ error: "Scraping server did not respond" });
	}
});

router.get("/logs", (req, res) => {
	const scraperId = req.query.scraperId as string | undefined;
	if (scraperId) {
		res.json({ scraperId, lines: getLogLines(scraperId) });
		return;
	}
	res.json({ scrapers: getAllLogLines() });
});

export default router;
