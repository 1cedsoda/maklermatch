import type { ParsedMail } from "mailparser";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import {
	conversations,
	conversationMessages,
	inboundEmails,
} from "../db/schema";
import { parseKleinanzeigenEmail } from "./parser";
import { logger } from "../logger";

const log = logger.child({ module: "email-processor" });

/**
 * Process an incoming email received by the SMTP server.
 *
 * Two scenarios:
 * 1. Notification from Kleinanzeigen about OUR sent message -> extract reply-to address
 * 2. A seller replied -> store the reply and trigger response generation
 */
export async function processIncomingEmail(
	mail: ParsedMail,
	fromAddress: string,
	toAddress: string,
): Promise<void> {
	const parsed = parseKleinanzeigenEmail(mail);

	// Store raw email for debugging
	const stored = db
		.insert(inboundEmails)
		.values({
			fromAddress,
			toAddress,
			subject: parsed.subject,
			bodyText: mail.text || null,
			bodyHtml: typeof mail.html === "string" ? mail.html : null,
			processed: false,
		})
		.returning()
		.get();

	if (!parsed.isFromKleinanzeigen) {
		log.info(
			{ from: fromAddress },
			"Non-Kleinanzeigen email, stored but not processed",
		);
		return;
	}

	if (!parsed.kleinanzeigenAddress) {
		log.warn("Kleinanzeigen email but no anonymized address found");
		return;
	}

	// Try to match to an existing conversation
	const conversation = db
		.select()
		.from(conversations)
		.where(eq(conversations.kleinanzeigenReplyTo, parsed.kleinanzeigenAddress))
		.get();

	if (conversation) {
		// This is a reply from the seller
		await handleSellerReply(
			conversation,
			parsed.messageText,
			parsed.senderName,
			parsed.kleinanzeigenAddress,
			parsed.conversationId,
			stored.id,
		);
	} else {
		// This might be a confirmation of our own sent message.
		// Try to link the anonymized address to a conversation that doesn't have one yet.
		await handleOutboundConfirmation(
			parsed.kleinanzeigenAddress,
			parsed.subject,
			parsed.conversationId,
			stored.id,
		);
	}

	// Mark email as processed
	db.update(inboundEmails)
		.set({
			processed: true,
			conversationId: conversation?.id ?? null,
		})
		.where(eq(inboundEmails.id, stored.id))
		.run();
}

async function handleSellerReply(
	conversation: typeof conversations.$inferSelect,
	messageText: string,
	senderName: string | null,
	kleinanzeigenAddress: string,
	kleinanzeigenConversationId: string | null,
	emailId: number,
): Promise<void> {
	log.info(
		{
			conversationId: conversation.id,
			sender: senderName,
			kleinanzeigenConversationId,
			text: messageText.slice(0, 80),
		},
		"Seller reply received",
	);

	// Store the inbound message
	db.insert(conversationMessages)
		.values({
			conversationId: conversation.id,
			direction: "inbound",
			channel: "email",
			body: messageText,
			kleinanzeigenAddress,
		})
		.run();

	// Update conversation status, seller name, and Kleinanzeigen conversation ID
	const updates: Record<string, unknown> = {
		status: "reply_received",
		lastMessageAt: new Date().toISOString(),
	};
	if (senderName && !conversation.sellerName) {
		updates.sellerName = senderName;
	}
	if (
		kleinanzeigenConversationId &&
		!conversation.kleinanzeigenConversationId
	) {
		updates.kleinanzeigenConversationId = kleinanzeigenConversationId;
	}

	db.update(conversations)
		.set(updates)
		.where(eq(conversations.id, conversation.id))
		.run();

	// Link email to conversation
	db.update(inboundEmails)
		.set({ conversationId: conversation.id })
		.where(eq(inboundEmails.id, emailId))
		.run();

	// TODO: Trigger reply generation via scheduler
	// This will be handled by the scheduler polling for conversations
	// with status "reply_received"
}

async function handleOutboundConfirmation(
	kleinanzeigenAddress: string,
	subject: string,
	kleinanzeigenConversationId: string | null,
	emailId: number,
): Promise<void> {
	// Find the most recent conversation without a reply-to address
	const unlinked = db
		.select()
		.from(conversations)
		.where(and(eq(conversations.status, "active")))
		.all()
		.filter((c) => !c.kleinanzeigenReplyTo);

	if (unlinked.length === 0) {
		log.warn(
			{ address: kleinanzeigenAddress },
			"No unlinked conversation found for outbound confirmation",
		);
		return;
	}

	// Link to the most recent unlinked conversation
	const target = unlinked[unlinked.length - 1];

	const updates: Record<string, unknown> = {
		kleinanzeigenReplyTo: kleinanzeigenAddress,
		emailSubject: subject,
	};
	if (kleinanzeigenConversationId) {
		updates.kleinanzeigenConversationId = kleinanzeigenConversationId;
	}

	db.update(conversations)
		.set(updates)
		.where(eq(conversations.id, target.id))
		.run();

	db.update(inboundEmails)
		.set({ conversationId: target.id })
		.where(eq(inboundEmails.id, emailId))
		.run();

	log.info(
		{
			conversationId: target.id,
			address: kleinanzeigenAddress,
			kleinanzeigenConversationId,
		},
		"Linked anonymized address to conversation",
	);
}
