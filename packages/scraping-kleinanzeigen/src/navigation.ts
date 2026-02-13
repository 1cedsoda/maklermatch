import type { Page } from "patchright";
import {
	humanClick,
	humanFill,
	humanDelay,
	humanBrowse,
	humanHover,
	humanScroll,
} from "@scraper/humanize";
import { logger } from "./logger";

const log = logger.child({ module: "navigation" });

export async function searchViaStartpage(page: Page): Promise<Page> {
	const query = encodeURIComponent("kleinanzeigen");
	const url = `https://www.startpage.com/sp/search?q=${query}`;
	log.info("Navigating to Startpage search results...");
	await page.goto(url, {
		waitUntil: "domcontentloaded",
		timeout: 60000,
	});
	log.info({ url: page.url() }, "Startpage loaded");

	const link = page.locator('a[href*="kleinanzeigen.de"]').first();
	await link.waitFor({ state: "visible", timeout: 10000 });
	// Wait for page to be fully interactive after DOM settles
	await humanDelay(page, 800);

	const popupPromise = page.waitForEvent("popup", { timeout: 5000 });
	log.info("Clicking Kleinanzeigen link...");
	await humanClick(page, link);

	let targetPage: Page;
	try {
		const popup = await popupPromise;
		log.info({ url: popup.url() }, "Popup opened");
		targetPage = popup;
	} catch {
		// Link opened in the same tab instead of a popup
		log.info("No popup detected, link opened in same tab");
		await page.waitForURL(/kleinanzeigen\.de/, { timeout: 15000 });
		log.info({ url: page.url() }, "Navigated to Kleinanzeigen in same tab");
		targetPage = page;
	}

	// Kleinanzeigen may geo-redirect based on proxy IP (e.g. to /s-frankfurt-am-main/k0).
	// Browse the page naturally, then navigate to the homepage to get the category tree.
	if (!targetPage.url().endsWith("kleinanzeigen.de/")) {
		await humanBrowse(targetPage);
		log.info("Navigating to homepage...");
		await targetPage.goto("https://www.kleinanzeigen.de/", {
			waitUntil: "domcontentloaded",
			timeout: 60000,
		});
		log.info({ url: targetPage.url() }, "Homepage loaded");
	}

	return targetPage;
}

export async function dismissCookieBanner(page: Page) {
	log.info("Looking for cookie banner...");
	try {
		const banner = page.locator("#gdpr-banner-accept");
		await banner.waitFor({ timeout: 10000 });

		// Sometimes scroll the banner text before accepting
		if (Math.random() < 0.25) {
			log.info("Reading cookie banner text...");
			try {
				await humanScroll(page, 100);
			} catch {
				// banner might not be scrollable
			}
		}

		// Reading pause before clicking accept
		await humanDelay(page, 1200);

		log.info("Banner found, clicking...");
		await humanClick(page, banner);
		log.info("Cookie banner dismissed");
	} catch {
		log.info("No cookie banner appeared");
	}
}

export async function navigateToCategory(
	page: Page,
	category: { slug: string; id: number },
) {
	const categoryUrl = `https://www.kleinanzeigen.de/s-${category.slug}/c${category.id}`;
	log.info(
		{ url: page.url(), targetCategory: category.slug },
		"Starting category navigation",
	);

	// Occasionally hover over sidebar categories before navigating (exploration)
	if (Math.random() < 0.3) {
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
	log.info({ url: page.url() }, "Category page loaded");

	// Brief scroll before applying filters — simulate human scanning the page
	await humanScroll(page, Math.round(150 + Math.random() * 200));
	await humanDelay(page, 1200);
}

export async function filterPrivateListings(page: Page) {
	log.info("Looking for 'anbieter:privat' filter...");
	const filterLink = page.locator(
		".browsebox-itemlist a[href*='anbieter:privat']",
	);
	try {
		await filterLink.waitFor({ state: "visible", timeout: 5000 });
		await humanClick(page, filterLink);
		await page.waitForLoadState("domcontentloaded");
		log.info({ url: page.url() }, "Filtered to private listings");
	} catch {
		log.warn("Private listing filter not available for this category");
	}

	// Brief scroll before setting location — don't linger
	await humanScroll(page, Math.round(100 + Math.random() * 150));
	await humanDelay(page, 800);
}

export async function setLocation(page: Page, location: string) {
	log.info({ location }, "Setting location...");
	const searchbox = page.getByRole("searchbox", { name: "PLZ oder Ort" });
	await searchbox.waitFor({ state: "visible", timeout: 10000 });
	log.info("Searchbox visible, filling...");

	await humanFill(page, searchbox, location);
	log.info("Text entered, waiting for autocomplete options...");

	const firstOption = page.getByRole("option").first();
	await firstOption.waitFor({ state: "visible", timeout: 20000 });
	log.info("Autocomplete option visible, waiting for it to stabilize...");

	// Wait for the dropdown to settle — options can re-render as results arrive
	await humanDelay(page, 800);

	// Find the option that matches the desired location, not just the first one
	const options = page.getByRole("option");
	const count = await options.count();
	let matched = firstOption;
	for (let i = 0; i < count; i++) {
		const text = await options.nth(i).textContent();
		if (text?.trim().toLowerCase().startsWith(location.toLowerCase())) {
			matched = options.nth(i);
			log.info(
				{ matched: text?.trim(), index: i },
				"Found matching autocomplete option",
			);
			break;
		}
	}

	log.info("Clicking autocomplete option...");
	await humanClick(page, matched);
	log.info({ url: page.url() }, "Location set");
}

export async function waitForListings(page: Page) {
	log.info("Waiting for listings table...");
	await page.waitForSelector("#srchrslt-adtable", { timeout: 15000 });
	await humanBrowse(page);
	log.info("Listings loaded");
}
