import { launchProxifiedBrowser } from "./browser";
import {
	searchViaStartpage,
	dismissCookieBanner,
	navigateToCategory,
	filterPrivateListings,
	setLocation,
	waitForListings,
} from "./navigation";
import { crawlAllPages } from "./crawl";
import type { Result } from "./result";

export async function scrapeListingPages(
	city: string,
): Promise<Result<string[]>> {
	const result = await launchProxifiedBrowser();
	if (!result.ok) return result;

	const { browser, page } = result.value;

	try {
		const kleinanzeigenPage = await searchViaStartpage(page);
		await dismissCookieBanner(kleinanzeigenPage);
		await navigateToCategory(kleinanzeigenPage);
		await filterPrivateListings(kleinanzeigenPage);
		await setLocation(kleinanzeigenPage, city);
		await waitForListings(kleinanzeigenPage);

		const pages = await crawlAllPages(kleinanzeigenPage);
		return { ok: true, value: pages };
	} catch (e) {
		return { ok: false, error: e as Error };
	} finally {
		await browser.close();
	}
}
