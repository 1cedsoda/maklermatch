import { Router } from "express";
import jwt from "jsonwebtoken";
import { loginRequestSchema, JWT_SECRET } from "@scraper/api-types";

const router = Router();

router.post("/login", (req, res) => {
	const parsed = loginRequestSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ error: "Invalid request body" });
		return;
	}

	const { username, password } = parsed.data;
	if (username !== "leonard" || password !== "illegal") {
		res.status(401).json({ error: "Invalid credentials" });
		return;
	}

	const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "24h" });
	res.json({ token });
});

export default router;
