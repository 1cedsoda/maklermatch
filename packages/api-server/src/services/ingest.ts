import { eq, desc, and, lt } from "drizzle-orm";
import type {
	IngestListing,
	DetailPage,
	ListingCheckItem,
	ListingCheckResult,
} from "@scraper/api-types";
import { db } from "../db";
import {
	scrapingTasks,
	listings,
	listingAbstractSnapshots,
	listingDetailSnapshots,
	sellers,
	sellerSnapshots,
} from "../db/schema";
import { logger } from "../logger";

const log = logger.child({ module: "ingest" });

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ─── Change Detection ────────────────────────────────────────

function hasAbstractChanged(
	scraped: IngestListing | ListingCheckItem,
	latest: typeof listingAbstractSnapshots.$inferSelect,
): boolean {
	return (
		scraped.title !== latest.title ||
		scraped.description !== latest.description ||
		scraped.price !== latest.price ||
		scraped.priceParsed !== latest.priceParsed ||
		scraped.location !== latest.location ||
		scraped.distance !== latest.distance ||
		scraped.imageUrl !== latest.imageUrl ||
		scraped.imageCount !== latest.imageCount ||
		scraped.isPrivate !== latest.isPrivate ||
		JSON.stringify(scraped.tags) !== JSON.stringify(latest.tags)
	);
}

function hasDetailChanged(
	scraped: DetailPage,
	latest: typeof listingDetailSnapshots.$inferSelect,
): boolean {
	return (
		scraped.description !== latest.description ||
		scraped.category !== (latest.category ?? null) ||
		JSON.stringify(scraped.imageUrls) !== JSON.stringify(latest.imageUrls) ||
		JSON.stringify(scraped.details) !== JSON.stringify(latest.details) ||
		JSON.stringify(scraped.features) !== JSON.stringify(latest.features) ||
		scraped.latitude !== latest.latitude ||
		scraped.longitude !== latest.longitude ||
		scraped.viewCount !== latest.viewCount
	);
}

function hasSellerChanged(
	scraped: DetailPage["seller"],
	latest: typeof sellerSnapshots.$inferSelect,
): boolean {
	return (
		scraped.name !== latest.name ||
		scraped.type !== latest.type ||
		scraped.activeSince !== latest.activeSince ||
		scraped.otherAdsCount !== latest.otherAdsCount
	);
}

// ─── Insert Helpers ──────────────────────────────────────────

function insertAbstractVersion(
	tx: Tx,
	listingId: string,
	item: IngestListing,
	now: string,
	previousVersionId: number | null,
	scrapingTaskId: number | null,
) {
	return tx
		.insert(listingAbstractSnapshots)
		.values({
			listingId,
			previousVersionId,
			url: item.url,
			title: item.title,
			description: item.description,
			price: item.price,
			priceParsed: item.priceParsed,
			location: item.location,
			distance: item.distance,
			date: item.date,
			dateParsed: item.dateParsed,
			imageUrl: item.imageUrl,
			imageCount: item.imageCount,
			isPrivate: item.isPrivate,
			tags: item.tags,
			seenAt: now,
			scrapingTaskId,
			html: item.abstractHtml ?? null,
		})
		.returning()
		.get();
}

function insertDetailSnapshot(
	tx: Tx,
	listingId: string,
	detail: DetailPage,
	sellerId: number | null,
	now: string,
	previousSnapshotId: number | null,
	scrapingTaskId: number | null,
) {
	return tx
		.insert(listingDetailSnapshots)
		.values({
			listingId,
			previousSnapshotId,
			description: detail.description,
			category: detail.category,
			imageUrls: detail.imageUrls,
			details: detail.details,
			features: detail.features,
			latitude: detail.latitude,
			longitude: detail.longitude,
			viewCount: detail.viewCount,
			sellerId,
			sellerName: detail.seller.name,
			sellerType: detail.seller.type,
			seenAt: now,
			scrapingTaskId,
			html: detail.html ?? null,
		})
		.returning()
		.get();
}

function upsertSeller(
	tx: Tx,
	sellerInfo: DetailPage["seller"],
	now: string,
	scrapingTaskId: number | null,
): number | null {
	if (!sellerInfo.userId) return null;

	let seller = tx
		.select()
		.from(sellers)
		.where(eq(sellers.externalId, sellerInfo.userId))
		.get();

	if (seller) {
		tx.update(sellers)
			.set({ lastSeen: now })
			.where(eq(sellers.id, seller.id))
			.run();
	} else {
		seller = tx
			.insert(sellers)
			.values({ externalId: sellerInfo.userId, firstSeen: now, lastSeen: now })
			.returning()
			.get();
	}

	const latestSnapshot = tx
		.select()
		.from(sellerSnapshots)
		.where(eq(sellerSnapshots.sellerId, seller.id))
		.orderBy(desc(sellerSnapshots.id))
		.limit(1)
		.get();

	if (!latestSnapshot || hasSellerChanged(sellerInfo, latestSnapshot)) {
		tx.insert(sellerSnapshots)
			.values({
				sellerId: seller.id,
				previousSnapshotId: latestSnapshot?.id ?? null,
				name: sellerInfo.name,
				type: sellerInfo.type,
				activeSince: sellerInfo.activeSince,
				otherAdsCount: sellerInfo.otherAdsCount,
				seenAt: now,
				scrapingTaskId,
			})
			.run();
	}

	return seller.id;
}

// ─── Listing Check ───────────────────────────────────────────

export function checkListings(items: ListingCheckItem[]): ListingCheckResult[] {
	return items.map((item) => {
		const existing = db
			.select()
			.from(listings)
			.where(eq(listings.id, item.id))
			.get();

		if (!existing) {
			return {
				id: item.id,
				status: "new" as const,
				detailPageLastScraped: null,
			};
		}

		const latestVersion = db
			.select()
			.from(listingAbstractSnapshots)
			.where(eq(listingAbstractSnapshots.listingId, item.id))
			.orderBy(desc(listingAbstractSnapshots.id))
			.limit(1)
			.get();

		if (!latestVersion || hasAbstractChanged(item, latestVersion)) {
			return {
				id: item.id,
				status: "changed" as const,
				detailPageLastScraped: existing.detailPageScrapedAt,
			};
		}

		return {
			id: item.id,
			status: "unchanged" as const,
			detailPageLastScraped: existing.detailPageScrapedAt,
		};
	});
}

// ─── Scraping Tasks ─────────────────────────────────────────

export function createScrapingTask(
	targetId: number,
	opts?: { maxPages?: number },
): { id: number } {
	const task = db
		.insert(scrapingTasks)
		.values({
			targetId,
			status: "pending",
			maxPages: opts?.maxPages ?? null,
		})
		.returning()
		.get();
	return { id: task.id };
}

export function getScrapingTask(id: number) {
	return db.select().from(scrapingTasks).where(eq(scrapingTasks.id, id)).get();
}

export function updateScrapingTask(
	id: number,
	data: {
		status?: "pending" | "success" | "error" | "cancelled";
		pagesScraped?: number;
		listingsFound?: number;
		detailsScraped?: number;
		detailsFailed?: number;
		errorMessage?: string;
		errorLogs?: { line: string; ts: number }[];
	},
): void {
	db.update(scrapingTasks).set(data).where(eq(scrapingTasks.id, id)).run();
}

// ─── Listing Removal ─────────────────────────────────────────

export function markRemovedListings(
	city: string,
	scrapedBefore: string,
): number {
	const removed = db
		.update(listings)
		.set({ status: "removed" })
		.where(
			and(
				eq(listings.city, city),
				eq(listings.status, "active"),
				lt(listings.lastSeen, scrapedBefore),
			),
		)
		.returning({ id: listings.id })
		.all();

	if (removed.length > 0) {
		log.info({ city, count: removed.length }, "Marked listings as removed");
	}

	return removed.length;
}

// ─── Ingest ──────────────────────────────────────────────────

export function ingestListings(
	city: string,
	items: IngestListing[],
	scrapingTaskId: number | null = null,
): {
	newCount: number;
	updatedCount: number;
	versionCount: number;
	detailSnapshotCount: number;
} {
	const now = new Date().toISOString();
	let newCount = 0;
	let updatedCount = 0;
	let versionCount = 0;
	let detailSnapshotCount = 0;
	let errorCount = 0;

	for (const item of items) {
		try {
			db.transaction((tx) => {
				const existing = tx
					.select()
					.from(listings)
					.where(eq(listings.id, item.id))
					.get();

				if (existing) {
					tx.update(listings)
						.set({
							url: item.url,
							status: "active",
							lastSeen: now,
							...(item.detailPage ? { detailPageScrapedAt: now } : {}),
						})
						.where(eq(listings.id, item.id))
						.run();

					// Abstract version chain
					const latestAbstract = tx
						.select()
						.from(listingAbstractSnapshots)
						.where(eq(listingAbstractSnapshots.listingId, item.id))
						.orderBy(desc(listingAbstractSnapshots.id))
						.limit(1)
						.get();

					if (!latestAbstract || hasAbstractChanged(item, latestAbstract)) {
						insertAbstractVersion(
							tx,
							item.id,
							item,
							now,
							latestAbstract?.id ?? null,
							scrapingTaskId,
						);
						versionCount++;
					}

					// Detail snapshot chain
					if (item.detailPage) {
						const sellerId = upsertSeller(
							tx,
							item.detailPage.seller,
							now,
							scrapingTaskId,
						);

						const latestDetail = tx
							.select()
							.from(listingDetailSnapshots)
							.where(eq(listingDetailSnapshots.listingId, item.id))
							.orderBy(desc(listingDetailSnapshots.id))
							.limit(1)
							.get();

						const sellerChanged = sellerId !== (latestDetail?.sellerId ?? null);
						if (
							!latestDetail ||
							hasDetailChanged(item.detailPage, latestDetail) ||
							sellerChanged
						) {
							insertDetailSnapshot(
								tx,
								item.id,
								item.detailPage,
								sellerId,
								now,
								latestDetail?.id ?? null,
								scrapingTaskId,
							);
							detailSnapshotCount++;
						}
					}

					updatedCount++;
				} else {
					tx.insert(listings)
						.values({
							id: item.id,
							city,
							url: item.url,
							status: "active",
							firstSeen: now,
							lastSeen: now,
							detailPageScrapedAt: item.detailPage ? now : null,
						})
						.run();

					insertAbstractVersion(tx, item.id, item, now, null, scrapingTaskId);
					versionCount++;

					if (item.detailPage) {
						const sellerId = upsertSeller(
							tx,
							item.detailPage.seller,
							now,
							scrapingTaskId,
						);
						insertDetailSnapshot(
							tx,
							item.id,
							item.detailPage,
							sellerId,
							now,
							null,
							scrapingTaskId,
						);
						detailSnapshotCount++;
					}

					newCount++;
				}
			});
		} catch (err) {
			log.error({ listingId: item.id, err }, "Failed to ingest listing");
			errorCount++;
		}
	}

	log.info(
		{
			new: newCount,
			updated: updatedCount,
			versions: versionCount,
			detailSnapshots: detailSnapshotCount,
			errors: errorCount,
		},
		"Ingested listings",
	);

	return { newCount, updatedCount, versionCount, detailSnapshotCount };
}
