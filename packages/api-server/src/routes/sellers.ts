import { Router } from "express";
import { eq, desc, count } from "drizzle-orm";
import { db } from "../db";
import {
	sellers,
	sellerSnapshots,
	listingDetailSnapshots,
	listings,
	listingAbstractSnapshots,
} from "../db/schema";

const router = Router();

router.get("/", (req, res) => {
	const page = Math.max(1, Number(req.query.page) || 1);
	const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
	const offset = (page - 1) * limit;

	const total = db.select({ count: count() }).from(sellers).get()!.count;

	const rows = db
		.select()
		.from(sellers)
		.orderBy(desc(sellers.lastSeen))
		.limit(limit)
		.offset(offset)
		.all();

	const sellersWithSnapshots = rows.map((seller) => {
		const latestSnapshot = db
			.select()
			.from(sellerSnapshots)
			.where(eq(sellerSnapshots.sellerId, seller.id))
			.orderBy(desc(sellerSnapshots.id))
			.limit(1)
			.get();

		const scrapedAdsCount = db
			.select({ count: count() })
			.from(listingDetailSnapshots)
			.where(eq(listingDetailSnapshots.sellerId, seller.id))
			.groupBy(listingDetailSnapshots.listingId)
			.all().length;

		return {
			...seller,
			latestSnapshot: latestSnapshot ?? null,
			scrapedAdsCount,
		};
	});

	res.json({ sellers: sellersWithSnapshots, total, page, limit });
});

router.get("/:id", (req, res) => {
	const seller = db
		.select()
		.from(sellers)
		.where(eq(sellers.id, Number(req.params.id)))
		.get();

	if (!seller) {
		res.status(404).json({ error: "Seller not found" });
		return;
	}

	const snapshots = db
		.select()
		.from(sellerSnapshots)
		.where(eq(sellerSnapshots.sellerId, seller.id))
		.orderBy(desc(sellerSnapshots.id))
		.all();

	// Find all distinct listings linked to this seller via detail snapshots
	const linkedDetailRows = db
		.select({ listingId: listingDetailSnapshots.listingId })
		.from(listingDetailSnapshots)
		.where(eq(listingDetailSnapshots.sellerId, seller.id))
		.groupBy(listingDetailSnapshots.listingId)
		.all();

	const sellerListings = linkedDetailRows.map(({ listingId }) => {
		const listing = db
			.select()
			.from(listings)
			.where(eq(listings.id, listingId))
			.get()!;

		const latestVersion = db
			.select()
			.from(listingAbstractSnapshots)
			.where(eq(listingAbstractSnapshots.listingId, listingId))
			.orderBy(desc(listingAbstractSnapshots.id))
			.limit(1)
			.get();

		return {
			...listing,
			latestVersion: latestVersion ?? null,
			sellerId: seller.id,
			sellerName: snapshots[0]?.name ?? null,
		};
	});

	res.json({ ...seller, snapshots, listings: sellerListings });
});

export default router;
