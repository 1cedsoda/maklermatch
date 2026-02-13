import { eq, and, lte } from "drizzle-orm";
import { db } from "../db";
import { scheduledSends, conversations } from "../db/schema";
import { getScraperSocket } from "../socket/scraper";
import { SocketEvents } from "@scraper/api-types";
import { logger } from "../logger";

const log = logger.child({ module: "send-scheduler" });

const POLL_INTERVAL_MS = 30_000;

let pollTimer: Timer | null = null;

/**
 * Schedule a message to be sent after a delay.
 */
export function scheduleSend(
	conversationId: number,
	message: string,
	delayMs: number,
): number {
	const sendAfter = new Date(Date.now() + delayMs).toISOString();

	const row = db
		.insert(scheduledSends)
		.values({
			conversationId,
			message,
			sendAfter,
		})
		.returning()
		.get();

	log.info(
		{
			id: row.id,
			conversationId,
			sendAfter,
			delayMs,
		},
		"Scheduled send",
	);

	return row.id;
}

/**
 * Start the polling loop that checks for due sends.
 */
export function startSendScheduler(): void {
	if (pollTimer) return;

	log.info("Send scheduler started");

	pollTimer = setInterval(async () => {
		try {
			await processDueSends();
		} catch (err) {
			log.error({ err }, "Error processing due sends");
		}
	}, POLL_INTERVAL_MS);

	// Also run immediately on start
	processDueSends().catch((err) =>
		log.error({ err }, "Error on initial send check"),
	);
}

export function stopSendScheduler(): void {
	if (pollTimer) {
		clearInterval(pollTimer);
		pollTimer = null;
		log.info("Send scheduler stopped");
	}
}

async function processDueSends(): Promise<void> {
	const now = new Date().toISOString();

	const dueSends = db
		.select()
		.from(scheduledSends)
		.where(
			and(
				eq(scheduledSends.status, "pending"),
				lte(scheduledSends.sendAfter, now),
			),
		)
		.all();

	for (const job of dueSends) {
		await executeSend(job);
	}
}

async function executeSend(
	job: typeof scheduledSends.$inferSelect,
): Promise<void> {
	// Mark as sending
	db.update(scheduledSends)
		.set({ status: "sending" })
		.where(eq(scheduledSends.id, job.id))
		.run();

	const conversation = db
		.select()
		.from(conversations)
		.where(eq(conversations.id, job.conversationId))
		.get();

	if (!conversation) {
		log.error(
			{ jobId: job.id, conversationId: job.conversationId },
			"Conversation not found for scheduled send",
		);
		db.update(scheduledSends)
			.set({ status: "cancelled" })
			.where(eq(scheduledSends.id, job.id))
			.run();
		return;
	}

	if (!conversation.kleinanzeigenConversationId) {
		log.warn(
			{ conversationId: conversation.id },
			"No Kleinanzeigen conversation ID, cannot send via browser",
		);
		db.update(scheduledSends)
			.set({ status: "cancelled" })
			.where(eq(scheduledSends.id, job.id))
			.run();
		return;
	}

	const socket = getScraperSocket();
	if (!socket) {
		log.warn({ jobId: job.id }, "No scraper connected, resetting to pending");
		db.update(scheduledSends)
			.set({ status: "pending" })
			.where(eq(scheduledSends.id, job.id))
			.run();
		return;
	}

	try {
		const result = await socket
			.timeout(120_000)
			.emitWithAck(SocketEvents.MESSAGE_SEND, {
				jobId: job.id,
				conversationId: conversation.id,
				kleinanzeigenConversationId: conversation.kleinanzeigenConversationId,
				message: job.message,
			});

		if (!result.ok) {
			throw new Error(result.error || "Scraper returned failure");
		}

		db.update(scheduledSends)
			.set({ status: "sent" })
			.where(eq(scheduledSends.id, job.id))
			.run();

		db.update(conversations)
			.set({ lastMessageAt: new Date().toISOString() })
			.where(eq(conversations.id, job.conversationId))
			.run();

		log.info(
			{
				jobId: job.id,
				conversationId: job.conversationId,
				kleinanzeigenConversationId: conversation.kleinanzeigenConversationId,
			},
			"Message sent via browser",
		);
	} catch (err) {
		log.error({ err, jobId: job.id }, "Failed to send message via browser");
		// Reset to pending so it retries on next poll
		db.update(scheduledSends)
			.set({ status: "pending" })
			.where(eq(scheduledSends.id, job.id))
			.run();
	}
}
