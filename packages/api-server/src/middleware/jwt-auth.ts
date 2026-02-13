import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@scraper/api-types";

export function jwtAuth(req: Request, res: Response, next: NextFunction) {
	const header = req.headers.authorization;
	if (!header?.startsWith("Bearer ")) {
		res.status(401).json({ error: "Missing or invalid Authorization header" });
		return;
	}

	const token = header.slice(7);
	try {
		const payload = jwt.verify(token, JWT_SECRET);
		(req as any).user = payload;
		next();
	} catch {
		res.status(401).json({ error: "Invalid or expired token" });
	}
}
