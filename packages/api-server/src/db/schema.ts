import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const scrapingTasks = sqliteTable("scraping_tasks", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	targetId: integer("target_id")
		.notNull()
		.references(() => searchTargets.id),
	startedAt: text("started_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	status: text("status", { enum: ["pending", "success", "error", "cancelled"] })
		.notNull()
		.default("pending"),
	maxPages: integer("max_pages"),
	pagesScraped: integer("pages_scraped"),
	listingsFound: integer("listings_found"),
	detailsScraped: integer("details_scraped"),
	detailsFailed: integer("details_failed"),
	errorMessage: text("error_message"),
	errorLogs: text("error_logs", { mode: "json" }).$type<
		{ line: string; ts: number }[]
	>(),
});

export const searchTargets = sqliteTable("search_targets", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	active: integer("active", { mode: "boolean" }).notNull().default(false),
	category: text("category").notNull(),
	location: text("location").notNull(),
	isPrivate: integer("is_private", { mode: "boolean" }),
	maxPages: integer("max_pages"),
	minIntervalMinutes: integer("min_interval_minutes").notNull().default(30),
	maxIntervalMinutes: integer("max_interval_minutes").notNull().default(60),
	sorting: text("sorting"),
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
		dateParsed: text("date_parsed"),
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
		html: text("html"),
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
	html: text("html"),
});

// --- Companies ---

export const companies = sqliteTable("companies", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	email: text("email"),
	description: text("description"),
	billingStreet: text("billing_street"),
	billingStreet2: text("billing_street_2"),
	billingCity: text("billing_city"),
	billingZipCode: text("billing_zip_code"),
	billingCountry: text("billing_country").default("Deutschland"),
	ustId: text("ust_id"),
	iban: text("iban"),
	bic: text("bic"),
	bankName: text("bank_name"),
	minPrice: integer("min_price"),
	maxPrice: integer("max_price"),
	active: integer("active", { mode: "boolean" }).notNull().default(true),
	createdAt: text("created_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
});

// --- Zip Code Groups (many-to-many: group has many zip codes and many brokers) ---

export const zipCodeGroups = sqliteTable("zip_code_groups", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	companyId: integer("company_id")
		.notNull()
		.references(() => companies.id),
	zipCodes: text("zip_codes").notNull(), // comma-separated: "79098,79100,79104"
	active: integer("active", { mode: "boolean" }).notNull().default(true),
	createdAt: text("created_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
});

export const zipCodeGroupBrokers = sqliteTable("zip_code_group_brokers", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	groupId: integer("group_id")
		.notNull()
		.references(() => zipCodeGroups.id),
	brokerId: integer("broker_id")
		.notNull()
		.references(() => brokers.id),
});

// --- Brokers ---

export const brokers = sqliteTable("brokers", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	companyId: integer("company_id").references(() => companies.id),
	name: text("name").notNull(),
	phone: text("phone"),
	email: text("email").notNull(),
	bio: text("bio"),
	active: integer("active", { mode: "boolean" }).notNull().default(true),
	createdAt: text("created_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
});

// --- Email / Conversations ---

export const conversations = sqliteTable("conversations", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	listingId: text("listing_id")
		.notNull()
		.references(() => listings.id),
	brokerId: text("broker_id").notNull(),
	brokerEmail: text("broker_email").notNull(),
	sellerName: text("seller_name"),
	kleinanzeigenConversationId: text("kleinanzeigen_conversation_id"),
	kleinanzeigenReplyTo: text("kleinanzeigen_reply_to"),
	emailSubject: text("email_subject"),
	status: text("status", {
		enum: ["active", "reply_received", "stopped", "done"],
	})
		.notNull()
		.default("active"),
	currentStage: text("current_stage", {
		enum: ["initial", "followup_1", "followup_2", "conversation", "done"],
	})
		.notNull()
		.default("initial"),
	replySentiment: text("reply_sentiment"),
	firstContactAt: text("first_contact_at"),
	lastMessageAt: text("last_message_at"),
	nextFollowupAt: text("next_followup_at"),
	createdAt: text("created_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
});

export const conversationMessages = sqliteTable("conversation_messages", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	conversationId: integer("conversation_id")
		.notNull()
		.references(() => conversations.id),
	direction: text("direction", { enum: ["outbound", "inbound"] }).notNull(),
	channel: text("channel", { enum: ["browser", "email"] }).notNull(),
	body: text("body").notNull(),
	stage: text("stage"),
	spamGuardScore: real("spam_guard_score"),
	kleinanzeigenAddress: text("kleinanzeigen_address"),
	sentAt: text("sent_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
});

export const inboundEmails = sqliteTable("inbound_emails", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	fromAddress: text("from_address").notNull(),
	toAddress: text("to_address").notNull(),
	subject: text("subject"),
	bodyText: text("body_text"),
	bodyHtml: text("body_html"),
	conversationId: integer("conversation_id").references(() => conversations.id),
	processed: integer("processed", { mode: "boolean" }).notNull().default(false),
	receivedAt: text("received_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
});

export const scheduledSends = sqliteTable("scheduled_sends", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	conversationId: integer("conversation_id")
		.notNull()
		.references(() => conversations.id),
	message: text("message").notNull(),
	sendAfter: text("send_after").notNull(),
	status: text("status", {
		enum: ["pending", "sending", "sent", "cancelled"],
	})
		.notNull()
		.default("pending"),
	createdAt: text("created_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
});
