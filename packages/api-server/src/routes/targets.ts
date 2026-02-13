import { Router } from "express";
import {
	createTargetRequestSchema,
	updateTargetRequestSchema,
} from "@scraper/api-types";
import {
	getAllTargets,
	getTargetById,
	createTarget,
	updateTarget,
	deleteTarget,
} from "../services/targets";
import { reloadTargets, getSchedulerState } from "../services/scheduler";

const router = Router();

router.get("/", (_req, res) => {
	const targets = getAllTargets();
	res.json({ targets });
});

router.get("/scheduler-status", (_req, res) => {
	const schedule = getSchedulerState();
	res.json({ schedule });
});

router.get("/:id", (req, res) => {
	const target = getTargetById(Number(req.params.id));
	if (!target) {
		res.status(404).json({ error: "Target not found" });
		return;
	}
	res.json(target);
});

router.post("/", (req, res) => {
	const parsed = createTargetRequestSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ error: parsed.error.flatten() });
		return;
	}
	const target = createTarget(parsed.data);
	res.status(201).json(target);
});

router.patch("/:id", (req, res) => {
	const parsed = updateTargetRequestSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ error: parsed.error.flatten() });
		return;
	}
	const existing = getTargetById(Number(req.params.id));
	if (!existing) {
		res.status(404).json({ error: "Target not found" });
		return;
	}
	const updated = updateTarget(Number(req.params.id), parsed.data);
	if (parsed.data.active !== undefined) {
		reloadTargets();
	}
	res.json(updated);
});

router.delete("/:id", (req, res) => {
	const existing = getTargetById(Number(req.params.id));
	if (!existing) {
		res.status(404).json({ error: "Target not found" });
		return;
	}
	deleteTarget(Number(req.params.id));
	if (existing.active) {
		reloadTargets();
	}
	res.status(204).end();
});

export default router;
