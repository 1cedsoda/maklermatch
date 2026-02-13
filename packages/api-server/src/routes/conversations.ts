import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import {
	conversations,
	conversationMessages,
	inboundEmails,
	listingAbstractSnapshots,
	listingDetailSnapshots,
	listings,
	brokers,
	companies,
} from "../db/schema";

const router = Router();

router.get("/", (_req, res) => {
	const rows = db
		.select()
		.from(conversations)
		.orderBy(desc(conversations.createdAt))
		.all();

	// Enrich with listing title
	const enriched = rows.map((conv) => {
		const snapshot = db
			.select({ title: listingAbstractSnapshots.title })
			.from(listingAbstractSnapshots)
			.where(eq(listingAbstractSnapshots.listingId, conv.listingId))
			.orderBy(desc(listingAbstractSnapshots.seenAt))
			.limit(1)
			.get();

		return { ...conv, listingTitle: snapshot?.title ?? null };
	});

	res.json(enriched);
});

router.get("/:id", (req, res) => {
	const id = Number(req.params.id);

	const conversation = db
		.select()
		.from(conversations)
		.where(eq(conversations.id, id))
		.get();

	if (!conversation) {
		res.status(404).json({ error: "Conversation not found" });
		return;
	}

	const messages = db
		.select()
		.from(conversationMessages)
		.where(eq(conversationMessages.conversationId, id))
		.orderBy(conversationMessages.sentAt)
		.all();

	const emails = db
		.select()
		.from(inboundEmails)
		.where(eq(inboundEmails.conversationId, id))
		.orderBy(inboundEmails.receivedAt)
		.all();

	// Load broker profile
	const brokerId = Number(conversation.brokerId);
	const broker = Number.isNaN(brokerId)
		? null
		: (db
				.select({
					id: brokers.id,
					companyId: brokers.companyId,
					companyName: companies.name,
					name: brokers.name,
					phone: brokers.phone,
					email: brokers.email,
					bio: brokers.bio,
					active: brokers.active,
					createdAt: brokers.createdAt,
				})
				.from(brokers)
				.leftJoin(companies, eq(brokers.companyId, companies.id))
				.where(eq(brokers.id, brokerId))
				.get() ?? null);

	// Load listing context
	const abstractSnapshot = db
		.select({
			title: listingAbstractSnapshots.title,
			price: listingAbstractSnapshots.price,
			location: listingAbstractSnapshots.location,
		})
		.from(listingAbstractSnapshots)
		.where(eq(listingAbstractSnapshots.listingId, conversation.listingId))
		.orderBy(desc(listingAbstractSnapshots.seenAt))
		.limit(1)
		.get();

	const detailSnapshot = db
		.select({ description: listingDetailSnapshots.description })
		.from(listingDetailSnapshots)
		.where(eq(listingDetailSnapshots.listingId, conversation.listingId))
		.orderBy(desc(listingDetailSnapshots.seenAt))
		.limit(1)
		.get();

	const listingRow = db
		.select({ url: listings.url })
		.from(listings)
		.where(eq(listings.id, conversation.listingId))
		.get();

	const listing =
		abstractSnapshot || detailSnapshot
			? {
					title: abstractSnapshot?.title ?? "",
					description: detailSnapshot?.description ?? "",
					price: abstractSnapshot?.price ?? null,
					location: abstractSnapshot?.location ?? null,
					url: listingRow?.url ?? "",
				}
			: null;

	res.json({ ...conversation, messages, emails, broker, listing });
});

router.post("/", (req, res) => {
	const { listingId, brokerId, brokerEmail, sellerName } = req.body;

	if (!listingId || !brokerId || !brokerEmail) {
		res
			.status(400)
			.json({ error: "listingId, brokerId, and brokerEmail are required" });
		return;
	}

	const created = db
		.insert(conversations)
		.values({
			listingId,
			brokerId: String(brokerId),
			brokerEmail,
			sellerName: sellerName ?? null,
			status: "active",
			currentStage: "initial",
		})
		.returning()
		.get();

	// Enrich with listing title
	const snapshot = db
		.select({ title: listingAbstractSnapshots.title })
		.from(listingAbstractSnapshots)
		.where(eq(listingAbstractSnapshots.listingId, created.listingId))
		.orderBy(desc(listingAbstractSnapshots.seenAt))
		.limit(1)
		.get();

	res.status(201).json({ ...created, listingTitle: snapshot?.title ?? null });
});

router.post("/:id/messages", (req, res) => {
	const conversationId = Number(req.params.id);
	const { direction, body, channel } = req.body;

	if (!direction || !body) {
		res.status(400).json({ error: "direction and body are required" });
		return;
	}

	if (direction !== "outbound" && direction !== "inbound") {
		res.status(400).json({ error: "direction must be outbound or inbound" });
		return;
	}

	const conversation = db
		.select()
		.from(conversations)
		.where(eq(conversations.id, conversationId))
		.get();

	if (!conversation) {
		res.status(404).json({ error: "Conversation not found" });
		return;
	}

	const message = db
		.insert(conversationMessages)
		.values({
			conversationId,
			direction,
			channel: channel ?? "browser",
			body,
		})
		.returning()
		.get();

	db.update(conversations)
		.set({ lastMessageAt: new Date().toISOString() })
		.where(eq(conversations.id, conversationId))
		.run();

	if (direction === "inbound") {
		db.update(conversations)
			.set({ status: "reply_received" })
			.where(eq(conversations.id, conversationId))
			.run();
	}

	res.status(201).json(message);
});

router.post("/:id/stop", (req, res) => {
	const id = Number(req.params.id);

	const conversation = db
		.select()
		.from(conversations)
		.where(eq(conversations.id, id))
		.get();

	if (!conversation) {
		res.status(404).json({ error: "Conversation not found" });
		return;
	}

	db.update(conversations)
		.set({ status: "stopped" })
		.where(eq(conversations.id, id))
		.run();

	res.json({ ok: true });
});

export default router;
