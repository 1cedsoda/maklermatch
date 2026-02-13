import { eq } from "drizzle-orm";
import { db } from "./db";
import { searchQuests } from "./db/schema";
import { logger } from "./logger";

const log = logger.child({ module: "seed" });

export function ensureBerlinQuest(): { id: number; city: string } {
	const existing = db
		.select()
		.from(searchQuests)
		.where(eq(searchQuests.city, "Berlin"))
		.get();

	if (existing) {
		log.info({ id: existing.id, city: existing.city }, "Search quest exists");
		return existing;
	}

	const quest = db
		.insert(searchQuests)
		.values({ city: "Berlin" })
		.returning()
		.get();

	log.info({ id: quest.id, city: quest.city }, "Created search quest");
	return quest;
}
