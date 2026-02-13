import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "../db";
import { companies, brokers } from "../db/schema";

const router = Router();

router.get("/", (_req, res) => {
	const rows = db
		.select({
			id: companies.id,
			name: companies.name,
			email: companies.email,
			description: companies.description,
			billingStreet: companies.billingStreet,
			billingStreet2: companies.billingStreet2,
			billingCity: companies.billingCity,
			billingZipCode: companies.billingZipCode,
			billingCountry: companies.billingCountry,
			ustId: companies.ustId,
			iban: companies.iban,
			bic: companies.bic,
			bankName: companies.bankName,
			minPrice: companies.minPrice,
			maxPrice: companies.maxPrice,
			active: companies.active,
			createdAt: companies.createdAt,
			brokerCount: sql<number>`count(${brokers.id})`.as("broker_count"),
		})
		.from(companies)
		.leftJoin(brokers, eq(brokers.companyId, companies.id))
		.groupBy(companies.id)
		.orderBy(desc(companies.id))
		.all();

	res.json(rows);
});

router.get("/:id", (req, res) => {
	const company = db
		.select()
		.from(companies)
		.where(eq(companies.id, Number(req.params.id)))
		.get();

	if (!company) {
		res.status(404).json({ error: "Company not found" });
		return;
	}

	const companyBrokers = db
		.select()
		.from(brokers)
		.where(eq(brokers.companyId, company.id))
		.all();

	res.json({ ...company, brokers: companyBrokers });
});

router.post("/", (req, res) => {
	const { name } = req.body;

	if (!name) {
		res.status(400).json({ error: "name is required" });
		return;
	}

	const created = db
		.insert(companies)
		.values({
			name,
			email: req.body.email ?? null,
			description: req.body.description ?? null,
			billingStreet: req.body.billingStreet ?? null,
			billingStreet2: req.body.billingStreet2 ?? null,
			billingCity: req.body.billingCity ?? null,
			billingZipCode: req.body.billingZipCode ?? null,
			billingCountry: req.body.billingCountry ?? "Deutschland",
			ustId: req.body.ustId ?? null,
			iban: req.body.iban ?? null,
			bic: req.body.bic ?? null,
			bankName: req.body.bankName ?? null,
			minPrice: req.body.minPrice ?? null,
			maxPrice: req.body.maxPrice ?? null,
		})
		.returning()
		.get();

	res.status(201).json(created);
});

router.put("/:id", (req, res) => {
	const id = Number(req.params.id);
	const existing = db
		.select()
		.from(companies)
		.where(eq(companies.id, id))
		.get();

	if (!existing) {
		res.status(404).json({ error: "Company not found" });
		return;
	}

	const {
		name,
		email,
		description,
		billingStreet,
		billingStreet2,
		billingCity,
		billingZipCode,
		billingCountry,
		ustId,
		iban,
		bic,
		bankName,
		minPrice,
		maxPrice,
		active,
	} = req.body;

	db.update(companies)
		.set({
			...(name !== undefined && { name }),
			...(email !== undefined && { email }),
			...(description !== undefined && { description }),
			...(billingStreet !== undefined && { billingStreet }),
			...(billingStreet2 !== undefined && { billingStreet2 }),
			...(billingCity !== undefined && { billingCity }),
			...(billingZipCode !== undefined && { billingZipCode }),
			...(billingCountry !== undefined && { billingCountry }),
			...(ustId !== undefined && { ustId }),
			...(iban !== undefined && { iban }),
			...(bic !== undefined && { bic }),
			...(bankName !== undefined && { bankName }),
			...(minPrice !== undefined && { minPrice }),
			...(maxPrice !== undefined && { maxPrice }),
			...(active !== undefined && { active }),
		})
		.where(eq(companies.id, id))
		.run();

	const updated = db.select().from(companies).where(eq(companies.id, id)).get();
	res.json(updated);
});

router.delete("/:id", (req, res) => {
	const id = Number(req.params.id);
	const existing = db
		.select()
		.from(companies)
		.where(eq(companies.id, id))
		.get();

	if (!existing) {
		res.status(404).json({ error: "Company not found" });
		return;
	}

	db.update(companies).set({ active: false }).where(eq(companies.id, id)).run();
	res.json({ ok: true });
});

export default router;
