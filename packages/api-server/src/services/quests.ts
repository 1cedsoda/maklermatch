import { eq } from "drizzle-orm";
import type {
	CategoryId,
	CreateQuestRequest,
	UpdateQuestRequest,
} from "@scraper/api-types";
import { db } from "../db";
import { searchQuests } from "../db/schema";

export function getAllQuests() {
	return db.select().from(searchQuests).all();
}

export function getActiveQuests() {
	return db
		.select()
		.from(searchQuests)
		.where(eq(searchQuests.active, true))
		.all();
}

export function getQuestById(id: number) {
	return db.select().from(searchQuests).where(eq(searchQuests.id, id)).get();
}

export function createQuest(data: CreateQuestRequest) {
	const now = new Date().toISOString();
	return db
		.insert(searchQuests)
		.values({
			name: data.name,
			category: data.category,
			location: data.location,
			isPrivate: data.isPrivate ?? null,
			maxPages: data.maxPages ?? null,
			minIntervalMinutes: data.minIntervalMinutes ?? 30,
			maxIntervalMinutes: data.maxIntervalMinutes ?? 60,
			createdAt: now,
			updatedAt: now,
		})
		.returning()
		.get();
}

export function updateQuest(id: number, data: UpdateQuestRequest) {
	const now = new Date().toISOString();
	return db
		.update(searchQuests)
		.set({ ...data, updatedAt: now })
		.where(eq(searchQuests.id, id))
		.returning()
		.get();
}

export function deleteQuest(id: number) {
	return db.delete(searchQuests).where(eq(searchQuests.id, id)).run();
}

export function questToKleinanzeigenSearch(
	quest: typeof searchQuests.$inferSelect,
) {
	return {
		category: quest.category as CategoryId,
		location: quest.location,
		...(quest.isPrivate != null ? { isPrivate: quest.isPrivate } : {}),
	};
}
