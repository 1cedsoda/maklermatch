import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import {
	zipCodeGroups,
	zipCodeGroupBrokers,
	brokers,
	companies,
} from "../db/schema";

const router = Router({ mergeParams: true });

type CompanyParams = { companyId: string };
type GroupParams = { companyId: string; id: string };

// GET /api/companies/:companyId/plz — All zip code groups for a company
router.get<CompanyParams>("/", (req, res) => {
	const companyId = Number(req.params.companyId);

	const groups = db
		.select()
		.from(zipCodeGroups)
		.where(eq(zipCodeGroups.companyId, companyId))
		.orderBy(zipCodeGroups.id)
		.all();

	const result = groups.map((g) => {
		const groupBrokers = db
			.select({
				id: zipCodeGroupBrokers.id,
				brokerId: zipCodeGroupBrokers.brokerId,
				brokerName: brokers.name,
			})
			.from(zipCodeGroupBrokers)
			.leftJoin(brokers, eq(brokers.id, zipCodeGroupBrokers.brokerId))
			.where(eq(zipCodeGroupBrokers.groupId, g.id))
			.all();

		return {
			id: g.id,
			companyId: g.companyId,
			zipCodes: g.zipCodes.split(",").map((s) => s.trim()),
			brokers: groupBrokers,
			active: g.active,
			createdAt: g.createdAt,
		};
	});

	res.json(result);
});

// POST /api/companies/:companyId/plz — Create a zip code group
router.post<CompanyParams>("/", (req, res) => {
	const companyId = Number(req.params.companyId);
	const { zipCodes, brokerIds } = req.body as {
		zipCodes: string[];
		brokerIds?: number[];
	};

	if (!Array.isArray(zipCodes) || zipCodes.length === 0) {
		res.status(400).json({ error: "zipCodes is required" });
		return;
	}

	const company = db
		.select()
		.from(companies)
		.where(eq(companies.id, companyId))
		.get();
	if (!company) {
		res.status(404).json({ error: "Company not found" });
		return;
	}

	const zipStr = zipCodes
		.map((s) => s.trim())
		.filter(Boolean)
		.join(",");

	const group = db
		.insert(zipCodeGroups)
		.values({
			companyId,
			zipCodes: zipStr,
		})
		.returning()
		.get();

	if (brokerIds && brokerIds.length > 0) {
		for (const brokerId of brokerIds) {
			db.insert(zipCodeGroupBrokers)
				.values({ groupId: group.id, brokerId })
				.run();
		}
	}

	res.status(201).json({ ...group, zipCodes: zipStr.split(",") });
});

// PUT /api/companies/:companyId/plz/:id — Update a zip code group
router.put<GroupParams>("/:id", (req, res) => {
	const companyId = Number(req.params.companyId);
	const id = Number(req.params.id);
	const { zipCodes, brokerIds } = req.body as {
		zipCodes?: string[];
		brokerIds?: number[];
	};

	const existing = db
		.select()
		.from(zipCodeGroups)
		.where(
			and(eq(zipCodeGroups.id, id), eq(zipCodeGroups.companyId, companyId)),
		)
		.get();

	if (!existing) {
		res.status(404).json({ error: "Group not found" });
		return;
	}

	if (zipCodes !== undefined) {
		const zipStr = zipCodes
			.map((s) => s.trim())
			.filter(Boolean)
			.join(",");
		db.update(zipCodeGroups)
			.set({ zipCodes: zipStr })
			.where(eq(zipCodeGroups.id, id))
			.run();
	}

	if (brokerIds !== undefined) {
		db.delete(zipCodeGroupBrokers)
			.where(eq(zipCodeGroupBrokers.groupId, id))
			.run();
		for (const brokerId of brokerIds) {
			db.insert(zipCodeGroupBrokers).values({ groupId: id, brokerId }).run();
		}
	}

	const updated = db
		.select()
		.from(zipCodeGroups)
		.where(eq(zipCodeGroups.id, id))
		.get();
	res.json(updated);
});

// DELETE /api/companies/:companyId/plz/:id — Delete a zip code group
router.delete<GroupParams>("/:id", (req, res) => {
	const companyId = Number(req.params.companyId);
	const id = Number(req.params.id);

	const existing = db
		.select()
		.from(zipCodeGroups)
		.where(
			and(eq(zipCodeGroups.id, id), eq(zipCodeGroups.companyId, companyId)),
		)
		.get();

	if (!existing) {
		res.status(404).json({ error: "Group not found" });
		return;
	}

	db.delete(zipCodeGroupBrokers)
		.where(eq(zipCodeGroupBrokers.groupId, id))
		.run();
	db.delete(zipCodeGroups).where(eq(zipCodeGroups.id, id)).run();

	res.json({ ok: true });
});

export default router;
