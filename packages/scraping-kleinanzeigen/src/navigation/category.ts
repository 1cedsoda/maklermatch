import type { Page } from "patchright";
import { Result } from "typescript-result";
import { humanDelay, humanHover, humanScroll } from "@scraper/humanize";
import {
	log,
	DEFAULT_RETRIES,
	withRetry,
	type NavigationOptions,
} from "./shared";
import { validateCategoryUrl } from "./validators";

export async function navigateToCategory(
	page: Page,
	category: { slug: string; id: number },
	options?: NavigationOptions,
): Promise<Result<void, Error>> {
	const retries = options?.retries ?? DEFAULT_RETRIES;

	return withRetry(
		async (attempt) => {
			try {
				const isRetry = attempt > 1;
				const categoryUrl = `https://www.kleinanzeigen.de/s-${category.slug}/c${category.id}`;
				log.info(
					{ url: page.url(), targetCategory: category.slug },
					"Starting category navigation",
				);

				// Occasionally hover over sidebar categories before navigating (exploration)
				if (!isRetry && Math.random() < 0.3) {
					log.info("Exploring sidebar categories before target...");
					const summaries = page.getByRole("group").locator("summary");
					const count = await summaries.count();
					if (count > 2) {
						const exploreCount = Math.random() < 0.5 ? 1 : 2;
						for (let i = 0; i < exploreCount; i++) {
							const idx = Math.floor(Math.random() * count);
							try {
								await humanHover(page, summaries.nth(idx));
								await humanDelay(page, 500);
							} catch {
								// element might not be visible
							}
						}
					}
				}

				log.info({ url: categoryUrl }, "Navigating to category page...");
				await page.goto(categoryUrl, {
					waitUntil: "domcontentloaded",
					timeout: 60000,
				});
				log.info(`Category page loaded: ${page.url()}`);

				if (!isRetry) {
					// Brief scroll before applying filters — simulate human scanning the page
					await humanScroll(page, Math.round(150 + Math.random() * 200));
					await humanDelay(page, 1200);
				}

				return validateCategoryUrl(page.url());
			} catch (e) {
				return Result.error(e instanceof Error ? e : new Error(String(e)));
			}
		},
		retries,
		"navigateToCategory",
	);
}
