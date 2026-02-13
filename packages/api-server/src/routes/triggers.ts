import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { searchTriggers } from "../db/schema";

const router = Router();

router.get("/", (req, res) => {
	const cityFilter = req.query.city as string | undefined;

	const query = cityFilter
		? db
				.select()
				.from(searchTriggers)
				.where(eq(searchTriggers.city, cityFilter))
				.orderBy(desc(searchTriggers.triggeredAt))
		: db
				.select()
				.from(searchTriggers)
				.orderBy(desc(searchTriggers.triggeredAt));

	const triggers = query.all();
	res.json({ triggers });
});

export default router;
