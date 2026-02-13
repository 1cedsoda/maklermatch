import { Router } from "express";
import { eq, desc, count } from "drizzle-orm";
import { db } from "../db";
import {
	listings,
	listingAbstractSnapshots,
	listingDetailSnapshots,
	sellers,
	sellerSnapshots,
} from "../db/schema";

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
			.from(listingAbstractSnapshots)
			.where(eq(listingAbstractSnapshots.listingId, listing.id))
			.orderBy(desc(listingAbstractSnapshots.id))
			.limit(1)
			.get();

		const latestDetail = db
			.select({
				sellerId: listingDetailSnapshots.sellerId,
				sellerName: listingDetailSnapshots.sellerName,
			})
			.from(listingDetailSnapshots)
			.where(eq(listingDetailSnapshots.listingId, listing.id))
			.orderBy(desc(listingDetailSnapshots.id))
			.limit(1)
			.get();

		return {
			...listing,
			latestVersion: latestVersion ?? null,
			sellerId: latestDetail?.sellerId ?? null,
			sellerName: latestDetail?.sellerName ?? null,
		};
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
		.from(listingAbstractSnapshots)
		.where(eq(listingAbstractSnapshots.listingId, listing.id))
		.orderBy(desc(listingAbstractSnapshots.id))
		.all();

	const detailSnapshots = db
		.select()
		.from(listingDetailSnapshots)
		.where(eq(listingDetailSnapshots.listingId, listing.id))
		.orderBy(desc(listingDetailSnapshots.id))
		.all();

	const latestDetail = detailSnapshots[0];
	let seller = null;
	if (latestDetail?.sellerId) {
		const sellerRow = db
			.select()
			.from(sellers)
			.where(eq(sellers.id, latestDetail.sellerId))
			.get();
		if (sellerRow) {
			const latestSellerSnapshot = db
				.select()
				.from(sellerSnapshots)
				.where(eq(sellerSnapshots.sellerId, sellerRow.id))
				.orderBy(desc(sellerSnapshots.id))
				.limit(1)
				.get();
			seller = { ...sellerRow, latestSnapshot: latestSellerSnapshot ?? null };
		}
	}

	res.json({ ...listing, versions, detailSnapshots, seller });
});

export default router;
