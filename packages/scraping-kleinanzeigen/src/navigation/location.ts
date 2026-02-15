import type { Page } from "patchright";
import { Result } from "typescript-result";
import { humanClick, humanFill, humanDelay } from "@scraper/humanize";
import {
	log,
	DEFAULT_RETRIES,
	withRetry,
	type NavigationOptions,
} from "./shared";
import { validateLocationUrl } from "./validators";

export async function setLocation(
	page: Page,
	location: string,
	options?: NavigationOptions,
): Promise<Result<void, Error>> {
	const retries = options?.retries ?? DEFAULT_RETRIES;
	const verify = options?.verify ?? true;
	if (!verify) {
		log.warn("URL verification is disabled for setLocation");
	}

	return withRetry(
		async () => {
			try {
				log.info({ location }, "Setting location...");
				const searchbox = page.getByRole("searchbox", {
					name: "PLZ oder Ort",
				});
				await searchbox.waitFor({ state: "visible", timeout: 10000 });
				log.info("Searchbox visible, filling...");

				const firstOption = page.getByRole("option").first();
				const maxAttempts = 3;
				let autocompleteWorked = false;

				for (let attempt = 1; attempt <= maxAttempts; attempt++) {
					await humanFill(page, searchbox, location);

					// Dispatch multiple events to ensure the autocomplete debounce triggers.
					// keyboard.insertText (used for non-ASCII like ü/ö) only fires "input",
					// not keydown/keyup.  Some autocomplete implementations listen on
					// different event types, so fire all of them.
					await searchbox.dispatchEvent("input");
					await searchbox.dispatchEvent("keyup");
					await searchbox.dispatchEvent("change");
					log.info({ attempt }, "Text entered, waiting for autocomplete...");

					try {
						await firstOption.waitFor({
							state: "visible",
							timeout: 10000,
						});
						autocompleteWorked = true;
						break;
					} catch {
						if (attempt < maxAttempts) {
							log.warn(
								{ attempt, location },
								"Autocomplete did not appear, clearing and retrying...",
							);
							// Clear the field before next attempt
							await searchbox.click();
							await page.keyboard.down("ControlOrMeta");
							await page.keyboard.press("a");
							await page.keyboard.up("ControlOrMeta");
							await page.keyboard.press("Backspace");
							await humanDelay(page, 500);
						}
					}
				}

				if (!autocompleteWorked) {
					return Result.error(
						new Error(
							`Autocomplete failed after ${maxAttempts} attempts for location "${location}"`,
						),
					);
				}

				// Wait for the dropdown to settle — options can re-render as results arrive
				await humanDelay(page, 800);

				// Find the option that matches the desired location, not just the first one
				const allOptions = page.getByRole("option");
				const count = await allOptions.count();
				let matched = firstOption;
				for (let i = 0; i < count; i++) {
					const text = await allOptions.nth(i).textContent();
					if (text?.trim().toLowerCase().startsWith(location.toLowerCase())) {
						matched = allOptions.nth(i);
						log.info(
							{ matched: text?.trim(), index: i },
							"Found matching autocomplete option",
						);
						break;
					}
				}

				log.info("Clicking autocomplete option...");
				const urlBefore = page.url();
				await humanClick(page, matched);

				// Clicking an autocomplete option triggers a page navigation —
				// wait for the URL to change so the location is actually applied.
				try {
					await page.waitForURL((url) => url.toString() !== urlBefore, {
						timeout: 15000,
					});
				} catch {
					log.warn("URL did not change after autocomplete selection");
				}
				await page.waitForLoadState("domcontentloaded");
				log.info(`Location set via autocomplete: ${page.url()}`);

				if (!verify) return Result.ok();
				return validateLocationUrl(page.url());
			} catch (e) {
				return Result.error(e instanceof Error ? e : new Error(String(e)));
			}
		},
		retries,
		"setLocation",
	);
}
