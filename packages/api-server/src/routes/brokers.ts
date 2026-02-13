import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { brokers } from "../db/schema";

const router = Router();

router.get("/", (_req, res) => {
	const rows = db.select().from(brokers).orderBy(desc(brokers.id)).all();

	res.json(rows);
});

router.get("/:id", (req, res) => {
	const broker = db
		.select()
		.from(brokers)
		.where(eq(brokers.id, Number(req.params.id)))
		.get();

	if (!broker) {
		res.status(404).json({ error: "Broker not found" });
		return;
	}

	res.json(broker);
});

router.post("/", (req, res) => {
	const {
		name,
		firma,
		region,
		spezialisierung,
		erfahrungJahre,
		provision,
		arbeitsweise,
		leistungen,
		besonderheiten,
		telefon,
		email,
		criteriaJson,
	} = req.body;

	if (!name || !firma || !region || !email) {
		res.status(400).json({ error: "name, firma, region, email are required" });
		return;
	}

	const created = db
		.insert(brokers)
		.values({
			name,
			firma,
			region,
			spezialisierung: spezialisierung ?? null,
			erfahrungJahre: erfahrungJahre ?? null,
			provision: provision ?? null,
			arbeitsweise: arbeitsweise ?? null,
			leistungen: leistungen ?? null,
			besonderheiten: besonderheiten ?? null,
			telefon: telefon ?? null,
			email,
			criteriaJson: criteriaJson ?? null,
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

	const {
		name,
		firma,
		region,
		spezialisierung,
		erfahrungJahre,
		provision,
		arbeitsweise,
		leistungen,
		besonderheiten,
		telefon,
		email,
		criteriaJson,
		active,
	} = req.body;

	db.update(brokers)
		.set({
			...(name !== undefined && { name }),
			...(firma !== undefined && { firma }),
			...(region !== undefined && { region }),
			...(spezialisierung !== undefined && { spezialisierung }),
			...(erfahrungJahre !== undefined && { erfahrungJahre }),
			...(provision !== undefined && { provision }),
			...(arbeitsweise !== undefined && { arbeitsweise }),
			...(leistungen !== undefined && { leistungen }),
			...(besonderheiten !== undefined && { besonderheiten }),
			...(telefon !== undefined && { telefon }),
			...(email !== undefined && { email }),
			...(criteriaJson !== undefined && { criteriaJson }),
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
