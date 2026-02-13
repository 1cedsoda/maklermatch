import { Router } from "express";
import { SCRAPER_SECRET, SCRAPER_SECRET_HEADER } from "@scraper/api-types";

const router = Router();

const SCRAPING_SERVER_URL =
	process.env.SCRAPING_SERVER_URL || "http://localhost:3002";

router.get("/status", async (_req, res) => {
	try {
		const response = await fetch(`${SCRAPING_SERVER_URL}/api/scraper/status`, {
			headers: { [SCRAPER_SECRET_HEADER]: SCRAPER_SECRET },
		});
		const data = await response.json();
		res.status(response.status).json(data);
	} catch {
		res.status(502).json({ error: "Scraping server unavailable" });
	}
});

router.post("/trigger", async (_req, res) => {
	try {
		const response = await fetch(`${SCRAPING_SERVER_URL}/api/scraper/trigger`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				[SCRAPER_SECRET_HEADER]: SCRAPER_SECRET,
			},
		});
		const data = await response.json();
		res.status(response.status).json(data);
	} catch {
		res.status(502).json({ error: "Scraping server unavailable" });
	}
});

export default router;
