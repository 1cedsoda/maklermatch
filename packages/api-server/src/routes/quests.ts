import { Router } from "express";
import {
	createQuestRequestSchema,
	updateQuestRequestSchema,
} from "@scraper/api-types";
import {
	getAllQuests,
	getQuestById,
	createQuest,
	updateQuest,
	deleteQuest,
} from "../services/quests";
import { reloadQuests } from "../services/scheduler";

const router = Router();

router.get("/", (_req, res) => {
	const quests = getAllQuests();
	res.json({ quests });
});

router.get("/:id", (req, res) => {
	const quest = getQuestById(Number(req.params.id));
	if (!quest) {
		res.status(404).json({ error: "Quest not found" });
		return;
	}
	res.json(quest);
});

router.post("/", (req, res) => {
	const parsed = createQuestRequestSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ error: parsed.error.flatten() });
		return;
	}
	const quest = createQuest(parsed.data);
	res.status(201).json(quest);
});

router.patch("/:id", (req, res) => {
	const parsed = updateQuestRequestSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ error: parsed.error.flatten() });
		return;
	}
	const existing = getQuestById(Number(req.params.id));
	if (!existing) {
		res.status(404).json({ error: "Quest not found" });
		return;
	}
	const updated = updateQuest(Number(req.params.id), parsed.data);
	if (parsed.data.active !== undefined) {
		reloadQuests();
	}
	res.json(updated);
});

router.delete("/:id", (req, res) => {
	const existing = getQuestById(Number(req.params.id));
	if (!existing) {
		res.status(404).json({ error: "Quest not found" });
		return;
	}
	deleteQuest(Number(req.params.id));
	if (existing.active) {
		reloadQuests();
	}
	res.status(204).end();
});

export default router;
