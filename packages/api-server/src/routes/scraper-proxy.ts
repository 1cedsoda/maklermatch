import { Router } from "express";
import { SocketEvents } from "@scraper/api-types";
import {
	getScraperSocket,
	getConnectedScrapers,
	getAllRunningTaskIds,
	getScraperIdForTask,
} from "../socket/scraper";
import {
	getTargetById,
	targetToKleinanzeigenSearch,
} from "../services/targets";
import { getScrapingTask } from "../services/ingest";
import {
	getLogLines,
	getAllLogLines,
	getTaskLogLines,
} from "../services/log-buffer";

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

		// Build active tasks array from server-side state
		const runningTaskIds = getAllRunningTaskIds();
		const activeTasks = runningTaskIds
			.map((tid) => {
				const task = getScrapingTask(tid);
				const target = task ? getTargetById(task.targetId) : null;
				if (!target) return null;
				return {
					id: tid,
					targetId: target.id,
					targetName: target.name,
					targetLocation: target.location,
				};
			})
			.filter((t) => t !== null);

		res.json({
			...scraperStatus,
			currentTask: activeTasks[0] ?? null,
			activeTasks,
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

router.post("/cancel", async (req, res) => {
	const taskId = Number(req.body.taskId);
	if (!taskId) {
		res.status(400).json({ error: "taskId is required" });
		return;
	}

	const scraperId = getScraperIdForTask(taskId);
	if (!scraperId) {
		res.status(404).json({ error: "Task not running on any scraper" });
		return;
	}

	const socket = getScraperSocket(scraperId);
	if (!socket) {
		res.status(502).json({ error: "Scraper not connected" });
		return;
	}

	try {
		const result = await socket
			.timeout(10_000)
			.emitWithAck(SocketEvents.SCRAPER_CANCEL_TASK, { taskId });
		res.json(result);
	} catch {
		res.status(504).json({ error: "Scraper did not respond" });
	}
});

router.get("/logs", (req, res) => {
	const taskId = req.query.taskId ? Number(req.query.taskId) : undefined;
	if (taskId) {
		res.json({ taskId, lines: getTaskLogLines(taskId) });
		return;
	}
	const scraperId = req.query.scraperId as string | undefined;
	if (scraperId) {
		res.json({ scraperId, lines: getLogLines(scraperId) });
		return;
	}
	res.json({ scrapers: getAllLogLines() });
});

export default router;
