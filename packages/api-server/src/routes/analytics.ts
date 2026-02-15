import { Router } from "express";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { db } from "../db";
import {
	conversations,
	conversationMessages,
	listings,
	listingAbstractSnapshots,
	scrapingTasks,
	searchTargets,
} from "../db/schema";

const router = Router();

/**
 * GET /api/analytics
 * Returns comprehensive analytics data for the dashboard
 */
router.get("/", (req, res) => {
	// Parse time range from query params (default to last 7 days)
	const daysBack = Number(req.query.days) || 7;
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - daysBack);
	const cutoffISO = cutoffDate.toISOString();

	// 1. Scraping Statistics
	const totalListings =
		db.select({ count: sql<number>`count(*)` }).from(listings).get()?.count ??
		0;

	const activeListings =
		db
			.select({ count: sql<number>`count(*)` })
			.from(listings)
			.where(eq(listings.status, "active"))
			.get()?.count ?? 0;

	const removedListings =
		db
			.select({ count: sql<number>`count(*)` })
			.from(listings)
			.where(eq(listings.status, "removed"))
			.get()?.count ?? 0;

	const newListingsInPeriod =
		db
			.select({ count: sql<number>`count(*)` })
			.from(listings)
			.where(gte(listings.firstSeen, cutoffISO))
			.get()?.count ?? 0;

	const scrapingTasksInPeriod =
		db
			.select({ count: sql<number>`count(*)` })
			.from(scrapingTasks)
			.where(gte(scrapingTasks.startedAt, cutoffISO))
			.get()?.count ?? 0;

	const successfulTasks =
		db
			.select({ count: sql<number>`count(*)` })
			.from(scrapingTasks)
			.where(
				and(
					gte(scrapingTasks.startedAt, cutoffISO),
					eq(scrapingTasks.status, "success"),
				),
			)
			.get()?.count ?? 0;

	const failedTasks =
		db
			.select({ count: sql<number>`count(*)` })
			.from(scrapingTasks)
			.where(
				and(
					gte(scrapingTasks.startedAt, cutoffISO),
					eq(scrapingTasks.status, "error"),
				),
			)
			.get()?.count ?? 0;

	// 2. Conversation & Messaging Statistics
	const totalConversations =
		db.select({ count: sql<number>`count(*)` }).from(conversations).get()
			?.count ?? 0;

	const conversationsInPeriod =
		db
			.select({ count: sql<number>`count(*)` })
			.from(conversations)
			.where(gte(conversations.createdAt, cutoffISO))
			.get()?.count ?? 0;

	// Conversations by status
	const conversationsByStatus = db
		.select({
			status: conversations.status,
			count: sql<number>`count(*)`,
		})
		.from(conversations)
		.groupBy(conversations.status)
		.all();

	// Conversations by stage
	const conversationsByStage = db
		.select({
			stage: conversations.currentStage,
			count: sql<number>`count(*)`,
		})
		.from(conversations)
		.groupBy(conversations.currentStage)
		.all();

	// Messages sent in period
	const messagesSentInPeriod =
		db
			.select({ count: sql<number>`count(*)` })
			.from(conversationMessages)
			.where(
				and(
					gte(conversationMessages.sentAt, cutoffISO),
					eq(conversationMessages.direction, "outbound"),
				),
			)
			.get()?.count ?? 0;

	const messagesReceivedInPeriod =
		db
			.select({ count: sql<number>`count(*)` })
			.from(conversationMessages)
			.where(
				and(
					gte(conversationMessages.sentAt, cutoffISO),
					eq(conversationMessages.direction, "inbound"),
				),
			)
			.get()?.count ?? 0;

	// Total outbound messages
	const totalOutboundMessages =
		db
			.select({ count: sql<number>`count(*)` })
			.from(conversationMessages)
			.where(eq(conversationMessages.direction, "outbound"))
			.get()?.count ?? 0;

	// 3. Lead Conversion Metrics
	// Listings with conversations vs without
	const listingsWithConversations =
		db
			.select({
				count: sql<number>`count(distinct ${conversations.listingId})`,
			})
			.from(conversations)
			.get()?.count ?? 0;

	const listingsWithoutConversations =
		totalListings - listingsWithConversations;

	// Conversion rate: active listings that have conversations
	const activeListingsWithConversations =
		db
			.select({
				count: sql<number>`count(distinct ${conversations.listingId})`,
			})
			.from(conversations)
			.innerJoin(listings, eq(conversations.listingId, listings.id))
			.where(eq(listings.status, "active"))
			.get()?.count ?? 0;

	const conversionRate =
		activeListings > 0
			? ((activeListingsWithConversations / activeListings) * 100).toFixed(1)
			: "0.0";

	// 4. Response rate
	const conversationsWithReplies =
		db
			.select({
				count: sql<number>`count(distinct ${conversationMessages.conversationId})`,
			})
			.from(conversationMessages)
			.where(eq(conversationMessages.direction, "inbound"))
			.get()?.count ?? 0;

	const responseRate =
		totalConversations > 0
			? ((conversationsWithReplies / totalConversations) * 100).toFixed(1)
			: "0.0";

	// 5. Daily activity chart data (last N days)
	const dailyActivity = db
		.select({
			date: sql<string>`date(${conversationMessages.sentAt})`,
			outbound: sql<number>`sum(case when ${conversationMessages.direction} = 'outbound' then 1 else 0 end)`,
			inbound: sql<number>`sum(case when ${conversationMessages.direction} = 'inbound' then 1 else 0 end)`,
		})
		.from(conversationMessages)
		.where(gte(conversationMessages.sentAt, cutoffISO))
		.groupBy(sql`date(${conversationMessages.sentAt})`)
		.orderBy(sql`date(${conversationMessages.sentAt})`)
		.all();

	// 6. Daily scraping activity
	const dailyScraping = db
		.select({
			date: sql<string>`date(${scrapingTasks.startedAt})`,
			tasks: sql<number>`count(*)`,
			success: sql<number>`sum(case when ${scrapingTasks.status} = 'success' then 1 else 0 end)`,
			error: sql<number>`sum(case when ${scrapingTasks.status} = 'error' then 1 else 0 end)`,
			listingsFound: sql<number>`sum(coalesce(${scrapingTasks.listingsFound}, 0))`,
		})
		.from(scrapingTasks)
		.where(gte(scrapingTasks.startedAt, cutoffISO))
		.groupBy(sql`date(${scrapingTasks.startedAt})`)
		.orderBy(sql`date(${scrapingTasks.startedAt})`)
		.all();

	// 7. Top performing targets (by listings found)
	const topTargets = db
		.select({
			targetId: scrapingTasks.targetId,
			targetName: searchTargets.name,
			totalListings: sql<number>`sum(coalesce(${scrapingTasks.listingsFound}, 0))`,
			taskCount: sql<number>`count(*)`,
		})
		.from(scrapingTasks)
		.innerJoin(searchTargets, eq(scrapingTasks.targetId, searchTargets.id))
		.where(gte(scrapingTasks.startedAt, cutoffISO))
		.groupBy(scrapingTasks.targetId, searchTargets.name)
		.orderBy(desc(sql`sum(coalesce(${scrapingTasks.listingsFound}, 0))`))
		.limit(5)
		.all();

	res.json({
		timeRange: {
			days: daysBack,
			startDate: cutoffISO,
			endDate: new Date().toISOString(),
		},
		scraping: {
			totalListings,
			activeListings,
			removedListings,
			newListingsInPeriod,
			scrapingTasksInPeriod,
			successfulTasks,
			failedTasks,
			successRate:
				scrapingTasksInPeriod > 0
					? ((successfulTasks / scrapingTasksInPeriod) * 100).toFixed(1)
					: "0.0",
		},
		conversations: {
			total: totalConversations,
			inPeriod: conversationsInPeriod,
			byStatus: conversationsByStatus,
			byStage: conversationsByStage,
			withReplies: conversationsWithReplies,
			responseRate,
		},
		messages: {
			totalOutbound: totalOutboundMessages,
			sentInPeriod: messagesSentInPeriod,
			receivedInPeriod: messagesReceivedInPeriod,
		},
		leads: {
			listingsWithConversations,
			listingsWithoutConversations,
			activeListingsWithConversations,
			conversionRate,
		},
		charts: {
			dailyActivity,
			dailyScraping,
			topTargets,
		},
	});
});

export default router;
