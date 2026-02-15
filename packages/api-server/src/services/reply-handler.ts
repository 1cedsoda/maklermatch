import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import {
	conversations,
	conversationMessages,
	scheduledSends,
	listings,
	listingAbstractSnapshots,
	listingDetailSnapshots,
} from "../db/schema";
import { logger } from "../logger";
import { SENTIMENT_REJECTION_CHECK } from "@scraper/agent";

const log = logger.child({ module: "reply-handler" });

interface ChatMessage {
	role: "user" | "assistant";
	content: string;
}

interface ChatResponse {
	content: string;
}

// Helper: Build conversation history for LLM
function buildConversationDiff(
	messages: (typeof conversationMessages.$inferSelect)[],
	listingText: string,
): string {
	const history = messages
		.map((m) => `${m.direction === "outbound" ? "Agent" : "User"}: ${m.body}`)
		.join("\n");

	return `LISTING:\n${listingText}\n\nCONVERSATION:\n${history}`;
}

// Helper: Detect [SKIP] in LLM response
function shouldSkipResponse(llmMessage: string): boolean {
	return llmMessage.trim() === "[SKIP]" || llmMessage.includes("[SKIP]");
}

// Helper: Call sentiment check agent
async function checkSentimentRejection(
	conversationHistory: string,
): Promise<{ rejected: boolean; reason: string }> {
	// Call LLM with SENTIMENT_REJECTION_CHECK prompt
	const response = await fetch("http://localhost:3000/api/chat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			messages: [
				{ role: "system", content: SENTIMENT_REJECTION_CHECK },
				{ role: "user", content: conversationHistory },
			],
		}),
	});

	if (!response.ok) {
		throw new Error(`Sentiment check API error: ${response.statusText}`);
	}

	const reader = response.body?.getReader();
	if (!reader) throw new Error("No response body");

	// Read streaming response
	const decoder = new TextDecoder();
	let fullText = "";

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		fullText += decoder.decode(value, { stream: true });
	}

	// Parse response (format: "JA\n[Grund]" or "NEIN\n[Grund]")
	const lines = fullText.trim().split("\n");
	const decision = lines[0].trim();
	const reason = lines[1]?.trim() || "Unknown";

	return {
		rejected: decision === "JA",
		reason,
	};
}

// Helper: Cancel pending follow-ups
async function cancelPendingFollowups(conversationId: number): Promise<void> {
	await db
		.update(scheduledSends)
		.set({ status: "cancelled" })
		.where(
			and(
				eq(scheduledSends.conversationId, conversationId),
				eq(scheduledSends.status, "pending"),
			),
		)
		.run();
}

// Helper: Calculate conversational delay
function calculateConversationalDelay(timeSinceLastMessage: number): number {
	// If < 30 minutes, add delay
	if (timeSinceLastMessage < 30 * 60 * 1000) {
		// Simple delay: 1-3 minutes
		const minDelay = 60 * 1000; // 1 min
		const maxDelay = 180 * 1000; // 3 min
		return Math.random() * (maxDelay - minDelay) + minDelay;
	}

	// Otherwise, send immediately
	return 0;
}

// Helper: Parse DELAY from follow-up message
function parseFollowupDelay(message: string): {
	cleanMessage: string;
	hoursDelay: number;
} {
	const delayRegex = /DELAY:\s*(\d+)/i;
	const match = message.match(delayRegex);

	if (!match) {
		// Default to 48 hours if not specified
		return { cleanMessage: message, hoursDelay: 48 };
	}

	const hoursDelay = Number.parseInt(match[1], 10);
	const cleanMessage = message.replace(delayRegex, "").trim();

	return { cleanMessage, hoursDelay };
}

// Helper: Build listing text from snapshots
function buildListingText(
	abstract: typeof listingAbstractSnapshots.$inferSelect,
	detail: typeof listingDetailSnapshots.$inferSelect | null,
): string {
	const parts: string[] = [];

	if (abstract.title) parts.push(abstract.title);
	if (abstract.description) parts.push(abstract.description);
	if (detail?.description && detail.description !== abstract.description) {
		parts.push(detail.description);
	}
	if (abstract.price) parts.push(`Preis: ${abstract.price}`);
	if (abstract.location) parts.push(`Ort: ${abstract.location}`);

	return parts.join("\n\n");
}

// Main: Handle seller reply
export async function handleSellerReply(conversationId: number): Promise<void> {
	log.info({ conversationId }, "Handling seller reply");

	try {
		// 1. Fetch conversation state
		const conversation = await db
			.select()
			.from(conversations)
			.where(eq(conversations.id, conversationId))
			.get();

		if (!conversation) {
			log.error({ conversationId }, "Conversation not found");
			return;
		}

		const messages = await db
			.select()
			.from(conversationMessages)
			.where(eq(conversationMessages.conversationId, conversationId))
			.orderBy(conversationMessages.sentAt)
			.all();

		// 2. Resurrected lead check
		if (conversation.status === "rejected") {
			log.info(
				{ conversationId },
				"Lead was rejected but seller wrote again - resetting",
			);
			await db
				.update(conversations)
				.set({ status: "engaged", rejectionReason: null })
				.where(eq(conversations.id, conversationId))
				.run();

			await cancelPendingFollowups(conversationId);
		}

		// 3. Conversational delay check
		const lastMessageTime = conversation.lastMessageAt
			? new Date(conversation.lastMessageAt).getTime()
			: Date.now();
		const timeSinceLastMessage = Date.now() - lastMessageTime;
		const delayMs = calculateConversationalDelay(timeSinceLastMessage);

		log.info(
			{ conversationId, timeSinceLastMessage, delayMs },
			"Calculated conversational delay",
		);

		// 4. Pre-messaging checks
		if (
			conversation.status === "listing_offline" ||
			conversation.status === "done"
		) {
			log.info(
				{ conversationId, status: conversation.status },
				"Conversation is done, not responding",
			);
			return;
		}

		if (!conversation.kleinanzeigenConversationId) {
			log.error(
				{ conversationId },
				"No kleinanzeigenConversationId, cannot respond",
			);
			await db
				.update(conversations)
				.set({ status: "listing_offline" })
				.where(eq(conversations.id, conversationId))
				.run();
			return;
		}

		// Check listing snapshot (only if > 32 minutes old)
		const shouldFetchSnapshot =
			!conversation.lastSnapshotFetchedAt ||
			Date.now() - new Date(conversation.lastSnapshotFetchedAt).getTime() >
				32 * 60 * 1000;

		if (shouldFetchSnapshot) {
			const listing = await db
				.select()
				.from(listings)
				.where(eq(listings.id, conversation.listingId))
				.get();

			if (!listing || listing.status !== "active") {
				log.info(
					{ conversationId },
					"Listing is offline, marking conversation",
				);
				await db
					.update(conversations)
					.set({
						status: "listing_offline",
						lastSnapshotFetchedAt: new Date().toISOString(),
					})
					.where(eq(conversations.id, conversationId))
					.run();
				return;
			}

			// Update lastSnapshotFetchedAt
			await db
				.update(conversations)
				.set({ lastSnapshotFetchedAt: new Date().toISOString() })
				.where(eq(conversations.id, conversationId))
				.run();
		}

		// 5. Fetch listing details for context
		const latestAbstract = await db
			.select()
			.from(listingAbstractSnapshots)
			.where(eq(listingAbstractSnapshots.listingId, conversation.listingId))
			.orderBy(desc(listingAbstractSnapshots.id))
			.limit(1)
			.get();

		const latestDetail = await db
			.select()
			.from(listingDetailSnapshots)
			.where(eq(listingDetailSnapshots.listingId, conversation.listingId))
			.orderBy(desc(listingDetailSnapshots.id))
			.limit(1)
			.get();

		if (!latestAbstract) {
			log.error({ conversationId }, "No listing snapshot found");
			return;
		}

		const listingText = buildListingText(latestAbstract, latestDetail);

		// 6. Sentiment check (NEW AGENT)
		const conversationHistory = buildConversationDiff(messages, listingText);
		const sentimentResult = await checkSentimentRejection(conversationHistory);

		if (sentimentResult.rejected) {
			log.info(
				{ conversationId, reason: sentimentResult.reason },
				"Seller rejected offer",
			);
			await db
				.update(conversations)
				.set({
					status: "rejected",
					rejectionReason: sentimentResult.reason,
				})
				.where(eq(conversations.id, conversationId))
				.run();

			await cancelPendingFollowups(conversationId);
			return;
		}

		// 7. Generate reply message
		const chatMessages: ChatMessage[] = messages.map((m) => ({
			role: m.direction === "outbound" ? "assistant" : "user",
			content: m.body,
		}));

		const response = await fetch("http://localhost:3000/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				messages: chatMessages,
				listingText,
			}),
		});

		if (!response.ok) {
			throw new Error(`Chat API error: ${response.statusText}`);
		}

		const reader = response.body?.getReader();
		if (!reader) throw new Error("No response body");

		// Read streaming response
		const decoder = new TextDecoder();
		let fullReply = "";

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			fullReply += decoder.decode(value, { stream: true });
		}

		// Parse [SKIP]
		if (shouldSkipResponse(fullReply)) {
			log.info({ conversationId }, "LLM returned [SKIP], not sending message");
			return;
		}

		// 8. Schedule reply send
		const now = Date.now();
		const sendAfter = new Date(now + delayMs).toISOString();

		await db.insert(scheduledSends).values({
			conversationId,
			message: fullReply,
			sendAfter,
			messageType: "conversational",
			status: "pending",
		});

		log.info({ conversationId, sendAfter }, "Reply scheduled");

		// 9. Generate ghosted follow-up (placeholder for now)
		// TODO: Call LLM to generate follow-up with DELAY
		const ghostedFollowup =
			"Wollte nochmal kurz nachhaken - hast du noch Fragen? Grüße";
		const hoursDelay = 48; // Default 2 days

		const followupSendAfter = new Date(
			now + hoursDelay * 3600 * 1000,
		).toISOString();

		await db.insert(scheduledSends).values({
			conversationId,
			message: ghostedFollowup,
			sendAfter: followupSendAfter,
			messageType: "conversational",
			hoursDelay,
			status: "pending",
		});

		log.info(
			{ conversationId, sendAfter: followupSendAfter },
			"Ghosted follow-up scheduled",
		);

		// 10. Update conversation record
		await db
			.update(conversations)
			.set({
				status: "engaged",
				currentStage: "conversation",
				nextFollowupAt: followupSendAfter,
			})
			.where(eq(conversations.id, conversationId))
			.run();

		log.info({ conversationId }, "Reply handling complete");
	} catch (err) {
		log.error({ conversationId, err }, "Failed to handle seller reply");
		throw err;
	}
}
