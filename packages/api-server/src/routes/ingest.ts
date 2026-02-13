import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import {
	createTriggerRequestSchema,
	updateTriggerRequestSchema,
	ingestListingsRequestSchema,
	type IngestListing,
} from "@scraper/api-types";
import { db } from "../db";
import { searchTriggers, listings, listingVersions } from "../db/schema";
import { logger } from "../logger";

const log = logger.child({ module: "ingest" });
const router = Router();

router.post("/trigger", (req, res) => {
	const parsed = createTriggerRequestSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ error: "Invalid request body" });
		return;
	}

	const trigger = db
		.insert(searchTriggers)
		.values({ city: parsed.data.city, status: "pending" })
		.returning()
		.get();

	res.status(201).json({ id: trigger.id });
});

router.patch("/trigger/:id", (req, res) => {
	const id = Number(req.params.id);
	const parsed = updateTriggerRequestSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ error: "Invalid request body" });
		return;
	}

	db.update(searchTriggers)
		.set(parsed.data)
		.where(eq(searchTriggers.id, id))
		.run();

	res.json({ ok: true });
});

function hasChanged(
	scraped: IngestListing,
	latest: typeof listingVersions.$inferSelect,
): boolean {
	return (
		scraped.title !== latest.title ||
		scraped.description !== latest.description ||
		scraped.price !== latest.price ||
		scraped.priceParsed !== latest.priceParsed ||
		scraped.location !== latest.location ||
		scraped.distance !== latest.distance ||
		scraped.date !== latest.date ||
		scraped.imageUrl !== latest.imageUrl ||
		scraped.imageCount !== latest.imageCount ||
		scraped.isPrivate !== latest.isPrivate ||
		JSON.stringify(scraped.tags) !== JSON.stringify(latest.tags)
	);
}

function insertVersion(
	listingId: string,
	item: IngestListing,
	now: string,
	previousVersionId: number | null,
) {
	return db
		.insert(listingVersions)
		.values({
			listingId,
			previousVersionId,
			title: item.title,
			description: item.description,
			price: item.price,
			priceParsed: item.priceParsed,
			location: item.location,
			distance: item.distance,
			date: item.date,
			imageUrl: item.imageUrl,
			imageCount: item.imageCount,
			isPrivate: item.isPrivate,
			tags: item.tags,
			seenAt: now,
		})
		.returning()
		.get();
}

router.post("/listings", (req, res) => {
	const parsed = ingestListingsRequestSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ error: "Invalid request body" });
		return;
	}

	const { city, listings: items } = parsed.data;
	const now = new Date().toISOString();
	let newCount = 0;
	let updatedCount = 0;
	let versionCount = 0;

	for (const item of items) {
		const existing = db
			.select()
			.from(listings)
			.where(eq(listings.id, item.id))
			.get();

		if (existing) {
			db.update(listings)
				.set({ lastSeen: now })
				.where(eq(listings.id, item.id))
				.run();

			const latestVersion = db
				.select()
				.from(listingVersions)
				.where(eq(listingVersions.listingId, item.id))
				.orderBy(desc(listingVersions.id))
				.limit(1)
				.get();

			if (!latestVersion || hasChanged(item, latestVersion)) {
				insertVersion(item.id, item, now, latestVersion?.id ?? null);
				versionCount++;
			}

			updatedCount++;
		} else {
			db.insert(listings)
				.values({
					id: item.id,
					city,
					url: item.url,
					firstSeen: now,
					lastSeen: now,
				})
				.run();

			insertVersion(item.id, item, now, null);
			newCount++;
			versionCount++;
		}
	}

	log.info(
		{ new: newCount, updated: updatedCount, versions: versionCount },
		"Ingested listings",
	);

	res.json({ newCount, updatedCount, versionCount });
});

export default router;
