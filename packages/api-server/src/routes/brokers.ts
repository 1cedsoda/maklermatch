import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { brokers, companies } from "../db/schema";

const router = Router();

router.get("/", (_req, res) => {
	const rows = db
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
		.orderBy(desc(brokers.id))
		.all();

	res.json(rows);
});

router.get("/:id", (req, res) => {
	const [broker] = db
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
		.where(eq(brokers.id, Number(req.params.id)))
		.all();

	if (!broker) {
		res.status(404).json({ error: "Broker not found" });
		return;
	}

	res.json(broker);
});

router.post("/", (req, res) => {
	const { name, phone, email, bio, companyId } = req.body;

	if (!name || !email) {
		res.status(400).json({ error: "name, email are required" });
		return;
	}

	const created = db
		.insert(brokers)
		.values({
			name,
			companyId: companyId ?? null,
			phone: phone ?? null,
			email,
			bio: bio ?? null,
		})
		.returning()
		.get();

	res.status(201).json(created);
});

router.put("/:id", (req, res) => {
	const id = Number(req.params.id);
	const existing = db.select().from(brokers).where(eq(brokers.id, id)).get();

	if (!existing) {
		res.status(404).json({ error: "Broker not found" });
		return;
	}

	const { name, phone, email, bio, companyId, active } = req.body;

	db.update(brokers)
		.set({
			...(name !== undefined && { name }),
			...(companyId !== undefined && { companyId }),
			...(phone !== undefined && { phone }),
			...(email !== undefined && { email }),
			...(bio !== undefined && { bio }),
			...(active !== undefined && { active }),
		})
		.where(eq(brokers.id, id))
		.run();

	const updated = db.select().from(brokers).where(eq(brokers.id, id)).get();
	res.json(updated);
});

router.delete("/:id", (req, res) => {
	const id = Number(req.params.id);
	const existing = db.select().from(brokers).where(eq(brokers.id, id)).get();

	if (!existing) {
		res.status(404).json({ error: "Broker not found" });
		return;
	}

	db.update(brokers).set({ active: false }).where(eq(brokers.id, id)).run();

	res.json({ ok: true });
});

export default router;
