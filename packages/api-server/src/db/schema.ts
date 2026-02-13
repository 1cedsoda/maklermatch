import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const scrapingTasks = sqliteTable("scraping_tasks", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	questId: integer("quest_id")
		.notNull()
		.references(() => searchQuests.id),
	startedAt: text("started_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	status: text("status", { enum: ["pending", "success", "error"] })
		.notNull()
		.default("pending"),
	maxPages: integer("max_pages"),
	pagesScraped: integer("pages_scraped"),
	listingsFound: integer("listings_found"),
	detailsScraped: integer("details_scraped"),
	detailsFailed: integer("details_failed"),
	errorMessage: text("error_message"),
});

export const searchQuests = sqliteTable("search_quests", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	active: integer("active", { mode: "boolean" }).notNull().default(false),
	category: text("category").notNull(),
	location: text("location").notNull(),
	isPrivate: integer("is_private", { mode: "boolean" }),
	maxPages: integer("max_pages"),
	minIntervalMinutes: integer("min_interval_minutes").notNull().default(30),
	maxIntervalMinutes: integer("max_interval_minutes").notNull().default(60),
	createdAt: text("created_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	updatedAt: text("updated_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
});

export const listings = sqliteTable("listings", {
	id: text("id").primaryKey(),
	city: text("city").notNull(),
	url: text("url").notNull(),
	status: text("status", { enum: ["active", "removed"] })
		.notNull()
		.default("active"),
	firstSeen: text("first_seen")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	lastSeen: text("last_seen")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	detailPageScrapedAt: text("detail_page_scraped_at"),
});

export const listingAbstractSnapshots = sqliteTable(
	"listing_abstract_snapshots",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		listingId: text("listing_id")
			.notNull()
			.references(() => listings.id),
		previousVersionId: integer("previous_version_id"),
		url: text("url"),
		title: text("title").notNull(),
		description: text("description").notNull(),
		price: text("price"),
		priceParsed: real("price_parsed"),
		location: text("location"),
		distance: text("distance"),
		date: text("date"),
		imageUrl: text("image_url"),
		imageCount: integer("image_count").notNull().default(0),
		isPrivate: integer("is_private", { mode: "boolean" })
			.notNull()
			.default(false),
		tags: text("tags", { mode: "json" }).$type<string[]>().notNull(),
		seenAt: text("seen_at")
			.notNull()
			.$defaultFn(() => new Date().toISOString()),
		scrapingTaskId: integer("scraping_task_id").references(
			() => scrapingTasks.id,
		),
	},
);

export const sellers = sqliteTable("sellers", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	externalId: text("external_id").notNull().unique(),
	firstSeen: text("first_seen")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	lastSeen: text("last_seen")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
});

export const sellerSnapshots = sqliteTable("seller_snapshots", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	sellerId: integer("seller_id")
		.notNull()
		.references(() => sellers.id),
	previousSnapshotId: integer("previous_snapshot_id"),
	name: text("name"),
	type: text("type", { enum: ["private", "commercial"] }),
	activeSince: text("active_since"),
	otherAdsCount: integer("other_ads_count"),
	seenAt: text("seen_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	scrapingTaskId: integer("scraping_task_id").references(
		() => scrapingTasks.id,
	),
});

export const listingDetailSnapshots = sqliteTable("listing_detail_snapshots", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	listingId: text("listing_id")
		.notNull()
		.references(() => listings.id),
	previousSnapshotId: integer("previous_snapshot_id"),
	description: text("description").notNull(),
	category: text("category"),
	imageUrls: text("image_urls", { mode: "json" }).$type<string[]>().notNull(),
	details: text("details", { mode: "json" })
		.$type<Record<string, string>>()
		.notNull(),
	features: text("features", { mode: "json" }).$type<string[]>().notNull(),
	latitude: real("latitude"),
	longitude: real("longitude"),
	viewCount: integer("view_count"),
	sellerId: integer("seller_id").references(() => sellers.id),
	sellerName: text("seller_name"),
	sellerType: text("seller_type"),
	seenAt: text("seen_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	scrapingTaskId: integer("scraping_task_id").references(
		() => scrapingTasks.id,
	),
});
