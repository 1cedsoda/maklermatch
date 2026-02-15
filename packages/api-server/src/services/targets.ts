import { eq } from "drizzle-orm";
import {
	type CategoryId,
	type CreateTargetRequest,
	type SortingOption,
	type UpdateTargetRequest,
	sortingSchema,
} from "@scraper/api-types";
import { db } from "../db";
import { searchTargets } from "../db/schema";

export function getAllTargets() {
	return db.select().from(searchTargets).all();
}

export function getActiveTargets() {
	return db
		.select()
		.from(searchTargets)
		.where(eq(searchTargets.active, true))
		.all();
}

export function getTargetById(id: number) {
	return db.select().from(searchTargets).where(eq(searchTargets.id, id)).get();
}

export function createTarget(data: CreateTargetRequest) {
	const now = new Date().toISOString();
	return db
		.insert(searchTargets)
		.values({
			name: data.name,
			category: data.category,
			location: data.location,
			sorting: data.sorting ?? null,
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

export function updateTarget(id: number, data: UpdateTargetRequest) {
	const now = new Date().toISOString();
	return db
		.update(searchTargets)
		.set({ ...data, updatedAt: now })
		.where(eq(searchTargets.id, id))
		.returning()
		.get();
}

export function deleteTarget(id: number) {
	return db.delete(searchTargets).where(eq(searchTargets.id, id)).run();
}

export function targetToKleinanzeigenSearch(
	target: typeof searchTargets.$inferSelect,
) {
	return {
		category: target.category as CategoryId,
		location: target.location,
		...(target.sorting != null &&
		sortingSchema.safeParse(target.sorting).success
			? { sorting: target.sorting as SortingOption }
			: {}),
		...(target.isPrivate != null ? { isPrivate: target.isPrivate } : {}),
	};
}
