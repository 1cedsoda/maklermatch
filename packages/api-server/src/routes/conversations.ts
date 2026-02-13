import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import {
	conversations,
	conversationMessages,
	inboundEmails,
} from "../db/schema";

const router = Router();

router.get("/", (_req, res) => {
	const rows = db
		.select()
		.from(conversations)
		.orderBy(desc(conversations.createdAt))
		.all();

	res.json(rows);
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

	res.json({ ...conversation, messages, emails });
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
