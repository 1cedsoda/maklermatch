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

function stripHtml<T extends { html: string | null }>(
	row: T,
): Omit<T, "html"> & { hasHtml: boolean } {
	const { html, ...rest } = row;
	return { ...rest, hasHtml: html != null };
}

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
				sellerType: listingDetailSnapshots.sellerType,
			})
			.from(listingDetailSnapshots)
			.where(eq(listingDetailSnapshots.listingId, listing.id))
			.orderBy(desc(listingDetailSnapshots.id))
			.limit(1)
			.get();

		return {
			...listing,
			latestVersion: latestVersion ? stripHtml(latestVersion) : null,
			sellerId: latestDetail?.sellerId ?? null,
			sellerName: latestDetail?.sellerName ?? null,
			sellerType: latestDetail?.sellerType ?? null,
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

	res.json({
		...listing,
		versions: versions.map(stripHtml),
		detailSnapshots: detailSnapshots.map(stripHtml),
		seller,
	});
});

router.get("/:id/abstract-snapshots/:snapshotId/html", (req, res) => {
	const snapshot = db
		.select({ html: listingAbstractSnapshots.html })
		.from(listingAbstractSnapshots)
		.where(eq(listingAbstractSnapshots.id, Number(req.params.snapshotId)))
		.get();

	if (!snapshot?.html) {
		res.status(404).json({ error: "HTML not found" });
		return;
	}

	res.setHeader("Content-Type", "text/html");
	res.setHeader(
		"Content-Disposition",
		`attachment; filename="abstract-${req.params.id}-${req.params.snapshotId}.html"`,
	);
	res.send(snapshot.html);
});

router.get("/:id/detail-snapshots/:snapshotId/html", (req, res) => {
	const snapshot = db
		.select({ html: listingDetailSnapshots.html })
		.from(listingDetailSnapshots)
		.where(eq(listingDetailSnapshots.id, Number(req.params.snapshotId)))
		.get();

	if (!snapshot?.html) {
		res.status(404).json({ error: "HTML not found" });
		return;
	}

	res.setHeader("Content-Type", "text/html");
	res.setHeader(
		"Content-Disposition",
		`attachment; filename="detail-${req.params.id}-${req.params.snapshotId}.html"`,
	);
	res.send(snapshot.html);
});

export default router;
