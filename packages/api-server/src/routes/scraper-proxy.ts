import { Router } from "express";
import { SocketEvents } from "@scraper/api-types";
import {
	getScraperSocket,
	getConnectedScrapers,
	getCurrentScrapingTaskId,
} from "../socket/scraper";
import {
	getTargetById,
	targetToKleinanzeigenSearch,
} from "../services/targets";
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
			targetId: number;
			targetName: string;
			targetLocation: string;
		} | null = null;
		const taskId = getCurrentScrapingTaskId();
		if (taskId) {
			const task = getScrapingTask(taskId);
			if (task) {
				const target = getTargetById(task.targetId);
				if (target) {
					currentTask = {
						id: taskId,
						targetId: target.id,
						targetName: target.name,
						targetLocation: target.location,
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
	const targetId = Number(req.body.targetId);
	if (!targetId) {
		res.status(400).json({ error: "targetId is required" });
		return;
	}

	const target = getTargetById(targetId);
	if (!target) {
		res.status(404).json({ error: "Target not found" });
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
				kleinanzeigenSearch: targetToKleinanzeigenSearch(target),
				targetId,
				maxPages: req.body.maxPages ?? target.maxPages ?? undefined,
				headless: req.body.headless,
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
