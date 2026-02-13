import { Router } from "express";
import { eq, desc, count } from "drizzle-orm";
import { db } from "../db";
import { listings, listingVersions } from "../db/schema";

const router = Router();

router.get("/", (req, res) => {
	const page = Math.max(1, Number(req.query.page) || 1);
	const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
	const offset = (page - 1) * limit;
	const cityFilter = req.query.city as string | undefined;

	const baseQuery = cityFilter
		? db.select().from(listings).where(eq(listings.city, cityFilter))
		: db.select().from(listings);

	const totalQuery = cityFilter
		? db
				.select({ count: count() })
				.from(listings)
				.where(eq(listings.city, cityFilter))
		: db.select({ count: count() }).from(listings);

	const total = totalQuery.get()!.count;

	const rows = baseQuery
		.orderBy(desc(listings.lastSeen))
		.limit(limit)
		.offset(offset)
		.all();

	const listingsWithVersions = rows.map((listing) => {
		const latestVersion = db
			.select()
			.from(listingVersions)
			.where(eq(listingVersions.listingId, listing.id))
			.orderBy(desc(listingVersions.id))
			.limit(1)
			.get();

		return { ...listing, latestVersion: latestVersion ?? null };
	});

	res.json({ listings: listingsWithVersions, total, page, limit });
});

router.get("/:id", (req, res) => {
	const listing = db
		.select()
		.from(listings)
		.where(eq(listings.id, req.params.id))
		.get();

	if (!listing) {
		res.status(404).json({ error: "Listing not found" });
		return;
	}

	const versions = db
		.select()
		.from(listingVersions)
		.where(eq(listingVersions.listingId, listing.id))
		.orderBy(desc(listingVersions.id))
		.all();

	res.json({ ...listing, versions });
});

export default router;
