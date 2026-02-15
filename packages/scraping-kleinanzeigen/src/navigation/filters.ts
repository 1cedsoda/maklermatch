import type { Page } from "patchright";
import type { SortingOption } from "@scraper/api-types";
import { Result } from "typescript-result";
import {
	humanClick,
	humanDelay,
	humanScroll,
	humanBrowse,
} from "@scraper/humanize";
import {
	log,
	DEFAULT_RETRIES,
	withRetry,
	type NavigationOptions,
} from "./shared";
import {
	validateAnbieterUrl,
	validateSortingUrl,
	type AnbieterType,
} from "./validators";

export type { AnbieterType } from "./validators";

export async function filterByAnbieter(
	page: Page,
	type: AnbieterType,
	options?: NavigationOptions,
): Promise<Result<void, Error>> {
	const retries = options?.retries ?? DEFAULT_RETRIES;
	const verify = options?.verify ?? true;
	if (!verify) {
		log.warn("URL verification is disabled for filterByAnbieter");
	}

	return withRetry(
		async (attempt) => {
			try {
				const isRetry = attempt > 1;
				log.info({ type }, `Looking for 'anbieter:${type}' filter...`);

				// Check if filter is already applied in the URL
				const existingResult = validateAnbieterUrl(page.url(), type);
				if (existingResult.ok) {
					log.info({ type }, "Anbieter filter already applied in URL");
					return existingResult;
				}

				const filterLink = page.locator(
					`.browsebox-itemlist a[href*='anbieter:${type}']`,
				);
				try {
					await filterLink.waitFor({
						state: "visible",
						timeout: 5000,
					});
				} catch {
					return Result.error(
						new Error(
							`Anbieter filter link 'anbieter:${type}' not found on page`,
						),
					);
				}

				const urlBefore = page.url();
				await humanClick(page, filterLink);

				try {
					await page.waitForURL((url) => url.toString() !== urlBefore, {
						timeout: 15000,
					});
				} catch {
					log.warn("URL did not change after clicking anbieter filter");
				}
				await page.waitForLoadState("domcontentloaded");
				log.info({ type, url: page.url() }, `Filtered to ${type} listings`);

				if (!isRetry) {
					await humanScroll(page, Math.round(100 + Math.random() * 150));
					await humanDelay(page, 800);
				}

				if (!verify) return Result.ok();
				return validateAnbieterUrl(page.url(), type);
			} catch (e) {
				return Result.error(e instanceof Error ? e : new Error(String(e)));
			}
		},
		retries,
		"filterByAnbieter",
	);
}

export async function filterPrivateListings(
	page: Page,
	options?: NavigationOptions,
): Promise<Result<void, Error>> {
	return filterByAnbieter(page, "privat", options);
}

export async function selectSorting(
	page: Page,
	sorting: SortingOption,
	options?: NavigationOptions,
): Promise<Result<void, Error>> {
	const retries = options?.retries ?? DEFAULT_RETRIES;
	const verify = options?.verify ?? true;
	if (!verify) {
		log.warn("URL verification is disabled for selectSorting");
	}

	return withRetry(
		async (attempt) => {
			try {
				const isRetry = attempt > 1;
				log.info({ sorting }, "Selecting sorting option...");

				const dropdown = page.locator("#sortingField-selector-inpt");
				try {
					await dropdown.waitFor({
						state: "visible",
						timeout: 5000,
					});
				} catch {
					return Result.error(
						new Error(
							"Sorting dropdown #sortingField-selector-inpt not visible",
						),
					);
				}

				// Check if already set to the desired sorting
				const currentValue = await page
					.locator("#sortingField-selector-value")
					.inputValue();
				const isDefault = currentValue === sorting;

				if (isDefault) {
					log.info(
						{ sorting },
						"Sorting already set (default), validating URL...",
					);
					if (!verify) return Result.ok();
					return validateSortingUrl(page.url(), sorting, true);
				}

				// Open the dropdown
				await humanClick(page, dropdown);
				if (!isRetry) {
					await humanDelay(page, 400);
				}

				// Click the desired option
				const option = page.locator(
					`#sortingField-selector-list li[data-value="${sorting}"]`,
				);
				try {
					await option.waitFor({
						state: "visible",
						timeout: 5000,
					});
				} catch {
					return Result.error(
						new Error(`Sorting option "${sorting}" not found in dropdown`),
					);
				}

				const urlBefore = page.url();
				await humanClick(page, option);

				// Sorting change triggers a page reload
				try {
					await page.waitForURL((url) => url.toString() !== urlBefore, {
						timeout: 15000,
					});
				} catch {
					log.warn("URL did not change after sorting selection");
				}
				await page.waitForLoadState("domcontentloaded");
				log.info({ sorting, url: page.url() }, "Sorting applied");

				if (!isRetry) {
					await humanDelay(page, 800);
				}

				if (!verify) return Result.ok();
				return validateSortingUrl(page.url(), sorting, false);
			} catch (e) {
				return Result.error(e instanceof Error ? e : new Error(String(e)));
			}
		},
		retries,
		"selectSorting",
	);
}

export async function waitForListings(page: Page) {
	log.info("Waiting for listings table...");
	await page.waitForSelector("#srchrslt-adtable", { timeout: 15000 });
	await humanBrowse(page);
	log.info("Listings loaded");
}
