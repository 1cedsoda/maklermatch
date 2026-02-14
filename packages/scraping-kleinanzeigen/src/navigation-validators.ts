import { Result } from "typescript-result";
import type { SortingOption } from "@scraper/api-types";

export type AnbieterType = "privat" | "gewerblich";

function getLastPathSegment(url: string): string {
	const pathname = new URL(url).pathname;
	const segments = pathname.split("/").filter(Boolean);
	return segments[segments.length - 1] ?? "";
}

/**
 * Validates that the URL's last path segment contains `c` followed by at least one digit.
 * Example: `/s-haus-kaufen/c208` → ok
 */
export function validateCategoryUrl(url: string): Result<void, Error> {
	const last = getLastPathSegment(url);
	if (/c\d+/.test(last)) {
		return Result.ok();
	}
	return Result.error(
		new Error(
			`Category validation failed: expected c<digits> in last segment "${last}" (url: ${url})`,
		),
	);
}

/**
 * Validates that the URL's last path segment contains `l` followed by at least one digit.
 * Example: `/s-haus-kaufen/berlin/c208l3331` → ok
 */
export function validateLocationUrl(url: string): Result<void, Error> {
	const last = getLastPathSegment(url);
	if (/l\d+/.test(last)) {
		return Result.ok();
	}
	return Result.error(
		new Error(
			`Location validation failed: expected l<digits> in last segment "${last}" (url: ${url})`,
		),
	);
}

/**
 * Validates that the URL contains an `anbieter:privat` or `anbieter:gewerblich` path segment.
 */
export function validateAnbieterUrl(
	url: string,
	type: AnbieterType,
): Result<void, Error> {
	const pathname = new URL(url).pathname;
	const segments = pathname.split("/").filter(Boolean);
	if (segments.some((s) => s === `anbieter:${type}`)) {
		return Result.ok();
	}
	return Result.error(
		new Error(
			`Anbieter validation failed: expected "anbieter:${type}" segment in URL "${pathname}"`,
		),
	);
}

const SORTING_SLUG_MAP: Record<SortingOption, string> = {
	SORTING_DATE: "neuste",
	PRICE_AMOUNT: "preis",
	PRICE_AMOUNT_DESC: "teuerste",
	RECOMMENDED: "relevanz",
};

const ALL_SORT_SLUGS = [
	"sortierung:preis",
	"sortierung:neuste",
	"sortierung:relevanz",
	"sortierung:teuerste",
];

/**
 * Validates sorting in the URL.
 * - Non-default sort: URL must contain the matching `sortierung:<slug>`.
 * - Default sort: URL must NOT contain any `sortierung:` slug.
 */
export function validateSortingUrl(
	url: string,
	sorting: SortingOption,
	isDefault: boolean,
): Result<void, Error> {
	const pathname = new URL(url).pathname;
	const hasSortSegment = ALL_SORT_SLUGS.some((slug) => pathname.includes(slug));

	if (isDefault) {
		if (hasSortSegment) {
			return Result.error(
				new Error(
					`Sorting validation failed: default sorting should have no sortierung slug, but URL contains one (url: ${url})`,
				),
			);
		}
		return Result.ok();
	}

	const expectedSlug = `sortierung:${SORTING_SLUG_MAP[sorting]}`;
	if (pathname.includes(expectedSlug)) {
		return Result.ok();
	}
	return Result.error(
		new Error(
			`Sorting validation failed: expected "${expectedSlug}" in URL "${pathname}"`,
		),
	);
}
