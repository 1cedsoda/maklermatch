import type { Request, Response, NextFunction } from "express";
import { SCRAPER_SECRET, SCRAPER_SECRET_HEADER } from "@scraper/api-types";

export function secretAuth(req: Request, res: Response, next: NextFunction) {
	const secret = req.headers[SCRAPER_SECRET_HEADER];
	if (secret !== SCRAPER_SECRET) {
		res.status(401).json({ error: "Invalid scraper secret" });
		return;
	}
	next();
}
