import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "../db";
import {
	listings,
	listingAbstractSnapshots,
	listingDetailSnapshots,
	brokers,
	zipCodeGroups,
	zipCodeGroupBrokers,
	conversations,
	scheduledSends,
} from "../db/schema";
import { logger } from "../logger";

const log = logger.child({ module: "lead-processor" });

interface GenerateResponse {
	text?: string;
	score?: number;
	attempt?: number;
	delayMs?: number;
	skipped?: boolean;
	gateRejection?: {
		type: string;
		reason: string;
	};
}

interface FollowupResponse {
	text: string;
	score: number;
	attempt: number;
	delayMs: number;
}

// Helper: Extract zip code from location string (e.g., "Freiburg (79098)")
function extractZipCode(location: string | null): string | null {
	if (!location) return null;
	const match = location.match(/\((\d{5})\)/);
	return match ? match[1] : null;
}

// Helper: Random broker selection from zip code group
async function assignBrokerToListing(
	zipCode: string,
): Promise<typeof brokers.$inferSelect | null> {
	const eligibleBrokers = await db
		.select({ broker: brokers })
		.from(brokers)
		.innerJoin(
			zipCodeGroupBrokers,
			eq(brokers.id, zipCodeGroupBrokers.brokerId),
		)
		.innerJoin(zipCodeGroups, eq(zipCodeGroupBrokers.groupId, zipCodeGroups.id))
		.where(
			and(
				sql`',' || ${zipCodeGroups.zipCodes} || ',' LIKE '%,' || ${zipCode} || ',%'`,
				eq(brokers.active, true),
				eq(zipCodeGroups.active, true),
			),
		)
		.all();

	if (eligibleBrokers.length === 0) return null;

	const randomIndex = Math.floor(Math.random() * eligibleBrokers.length);
	return eligibleBrokers[randomIndex].broker;
}

// Helper: Build listing text for LLM
function buildListingText(
	abstract: typeof listingAbstractSnapshots.$inferSelect,
	detail: typeof listingDetailSnapshots.$inferSelect | null,
): string {
	const parts: string[] = [];

	// Title
	if (abstract.title) parts.push(abstract.title);

	// Abstract description
	if (abstract.description) parts.push(abstract.description);

	// Detail description (usually longer)
	if (detail?.description && detail.description !== abstract.description) {
		parts.push(detail.description);
	}

	// Price
	if (abstract.price) parts.push(`Preis: ${abstract.price}`);

	// Location
	if (abstract.location) parts.push(`Ort: ${abstract.location}`);

	// Details (key-value pairs from detail page)
	if (detail?.details) {
		const detailsObj =
			typeof detail.details === "string"
				? JSON.parse(detail.details)
				: detail.details;
		const detailsText = Object.entries(detailsObj)
			.map(([key, value]) => `${key}: ${value}`)
			.join("\n");
		if (detailsText) parts.push(detailsText);
	}

	return parts.join("\n\n");
}

// Helper: Call LLM generate endpoint
async function callGenerateAPI(
	listingText: string,
	listingId: string,
	sellerName: string | null,
): Promise<GenerateResponse> {
	const response = await fetch("http://localhost:3000/api/generate", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			listingText,
			listingId,
			sellerName,
		}),
	});

	if (!response.ok) {
		throw new Error(`LLM API error: ${response.statusText}`);
	}

	return response.json();
}

// Helper: Call LLM follow-up generation (using same endpoint with different stage)
async function generateFollowup(
	stage: 1 | 2,
	listingText: string,
	listingId: string,
	sellerName: string | null,
): Promise<FollowupResponse> {
	// TODO: This should call a different endpoint or pass stage parameter
	// For now, using MessageGenerator directly would be better
	// But we'll implement a workaround by calling the agent package directly

	log.warn(
		{ stage },
		"Follow-up generation not fully implemented - using placeholder",
	);

	// Placeholder: Return default follow-up message
	const defaultMessages = {
		1: "Hallo nochmal, wollte kurz nachfragen ob noch Interesse besteht. VG",
		2: "Letzte Nachricht von mir - falls du doch Unterstützung brauchst, melde dich gerne. Grüße",
	};

	return {
		text: defaultMessages[stage],
		score: 8,
		attempt: 1,
		delayMs: 0, // Will calculate separately
	};
}

// Helper: Calculate follow-up timing (from FollowUpEngine logic)
function calculateFollowupTiming(stage: 1 | 2): number {
	const now = Date.now();

	if (stage === 1) {
		// 3-5 days with randomization
		const baseDays = 3;
		const rangeDays = 2; // 3-5
		const randomDays = baseDays + Math.random() * rangeDays;
		const randomHours = Math.random() * 24; // Add randomization within day
		return now + randomDays * 24 * 3600 * 1000 + randomHours * 3600 * 1000;
	}

	// 10-14 days with randomization
	const baseDays = 10;
	const rangeDays = 4; // 10-14
	const randomDays = baseDays + Math.random() * rangeDays;
	const randomHours = Math.random() * 24;
	return now + randomDays * 24 * 3600 * 1000 + randomHours * 3600 * 1000;
}

// Main: Process new listing
export async function processNewListing(listingId: string): Promise<void> {
	log.info({ listingId }, "Processing new listing");

	try {
		// 1. Fetch listing data
		const listing = await db
			.select()
			.from(listings)
			.where(eq(listings.id, listingId))
			.get();

		if (!listing) {
			log.error({ listingId }, "Listing not found");
			return;
		}

		const latestAbstract = await db
			.select()
			.from(listingAbstractSnapshots)
			.where(eq(listingAbstractSnapshots.listingId, listingId))
			.orderBy(desc(listingAbstractSnapshots.id))
			.limit(1)
			.get();

		if (!latestAbstract) {
			log.error({ listingId }, "No abstract snapshot found");
			return;
		}

		const latestDetail = await db
			.select()
			.from(listingDetailSnapshots)
			.where(eq(listingDetailSnapshots.listingId, listingId))
			.orderBy(desc(listingDetailSnapshots.id))
			.limit(1)
			.get();

		const listingText = buildListingText(latestAbstract, latestDetail);
		const sellerName = latestDetail?.sellerName || null;
		const listingUrl = latestAbstract.url || listing.url;

		// 2. Generate initial message (includes LISTING_GATE check)
		const generateResult = await callGenerateAPI(
			listingText,
			listingId,
			sellerName,
		);

		if (generateResult.skipped || !generateResult.text) {
			log.info(
				{ listingId, reason: generateResult.gateRejection },
				"Listing rejected by gate",
			);
			return;
		}

		// 3. Assign broker
		const zipCode = extractZipCode(latestAbstract.location);
		if (!zipCode) {
			log.warn(
				{ listingId, location: latestAbstract.location },
				"No zip code found",
			);
			return;
		}

		const broker = await assignBrokerToListing(zipCode);
		if (!broker) {
			log.warn({ listingId, zipCode }, "No eligible broker found");
			return;
		}

		log.info(
			{ listingId, brokerId: broker.id, brokerName: broker.name },
			"Broker assigned",
		);

		// 4. Create conversation record
		const conversation = await db
			.insert(conversations)
			.values({
				listingId,
				brokerId: broker.id.toString(),
				brokerEmail: broker.email,
				sellerName,
				status: "active",
				currentStage: "initial",
				firstContactAt: new Date().toISOString(),
			})
			.returning()
			.get();

		// 5. Schedule initial message
		const now = Date.now();
		const initialSendAfter = new Date(
			now + (generateResult.delayMs || 0),
		).toISOString();

		await db.insert(scheduledSends).values({
			conversationId: conversation.id,
			message: generateResult.text,
			sendAfter: initialSendAfter,
			messageType: "initial",
			status: "pending",
		});

		log.info(
			{ conversationId: conversation.id, sendAfter: initialSendAfter },
			"Initial message scheduled",
		);

		// 6. Generate and schedule follow-up 1
		const followup1 = await generateFollowup(
			1,
			listingText,
			listingId,
			sellerName,
		);
		const followup1SendAfter = new Date(
			calculateFollowupTiming(1),
		).toISOString();

		await db.insert(scheduledSends).values({
			conversationId: conversation.id,
			message: followup1.text,
			sendAfter: followup1SendAfter,
			messageType: "followup_1",
			status: "pending",
		});

		log.info(
			{ conversationId: conversation.id, sendAfter: followup1SendAfter },
			"Follow-up 1 scheduled",
		);

		// 7. Generate and schedule follow-up 2
		const followup2 = await generateFollowup(
			2,
			listingText,
			listingId,
			sellerName,
		);
		const followup2SendAfter = new Date(
			calculateFollowupTiming(2),
		).toISOString();

		await db.insert(scheduledSends).values({
			conversationId: conversation.id,
			message: followup2.text,
			sendAfter: followup2SendAfter,
			messageType: "followup_2",
			status: "pending",
		});

		log.info(
			{ conversationId: conversation.id, sendAfter: followup2SendAfter },
			"Follow-up 2 scheduled",
		);

		// 8. Update conversation with next follow-up time
		await db
			.update(conversations)
			.set({ nextFollowupAt: followup1SendAfter })
			.where(eq(conversations.id, conversation.id))
			.run();

		log.info({ conversationId: conversation.id }, "Lead processing complete");
	} catch (err) {
		log.error({ listingId, err }, "Failed to process new listing");
		throw err;
	}
}
