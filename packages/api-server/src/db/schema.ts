import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const searchTriggers = sqliteTable("search_triggers", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	city: text("city").notNull(),
	triggeredAt: text("triggered_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	status: text("status", { enum: ["pending", "success", "error"] })
		.notNull()
		.default("pending"),
	pagesScraped: integer("pages_scraped"),
	listingsFound: integer("listings_found"),
	errorMessage: text("error_message"),
});

export const listings = sqliteTable("listings", {
	id: text("id").primaryKey(),
	city: text("city").notNull(),
	url: text("url").notNull(),
	firstSeen: text("first_seen")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	lastSeen: text("last_seen")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
});

export const listingVersions = sqliteTable("listing_versions", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	listingId: text("listing_id")
		.notNull()
		.references(() => listings.id),
	previousVersionId: integer("previous_version_id"),
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
});
