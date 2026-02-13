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

	const popupPromise = page.waitForEvent("popup");
	log.info("Clicking Kleinanzeigen link...");
	await humanClick(
		page,
		page.getByText("https://www.kleinanzeigen.de/https://www.kleinanzeigen.de"),
	);

	const popup = await popupPromise;
	log.info({ url: popup.url() }, "Popup opened");
	return popup;
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

export async function navigateToCategory(page: Page) {
	log.info({ url: page.url() }, "Starting category navigation");

	// Occasionally hover over other categories before the target (exploration)
	if (Math.random() < 0.3) {
		log.info("Exploring other categories before target...");
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

	log.info("Expanding first category group...");
	await humanClick(
		page,
		page
			.getByRole("group")
			.filter({ hasText: "Mehr ... Badezimmer Büro" })
			.locator("summary"),
	);

	// Scanning pause between category clicks
	await humanDelay(page, 800);

	log.info("Expanding 'Häuser zum Kauf' sub-group...");
	await humanClick(
		page,
		page
			.getByRole("group")
			.filter({ hasText: "Mehr ... Häuser zum Kauf Auf" })
			.locator("summary"),
	);

	// Another natural pause
	await humanDelay(page, 600);

	log.info("Clicking 'Häuser zum Kauf' link...");
	await humanClick(page, page.getByRole("link", { name: "Häuser zum Kauf" }));
	await page.waitForLoadState("load");
	log.info({ url: page.url() }, "Category page loaded");
	await humanBrowse(page);
}

export async function filterPrivateListings(page: Page) {
	log.info("Clicking 'anbieter:privat' filter...");
	await humanClick(
		page,
		page.locator(".browsebox-itemlist a[href*='anbieter:privat']"),
	);
	await page.waitForLoadState("load");
	log.info({ url: page.url() }, "Filtered to private listings");
	await humanBrowse(page);
}

export async function setLocation(page: Page, location: string) {
	log.info({ location }, "Setting location...");
	const searchbox = page.getByRole("searchbox", { name: "PLZ oder Ort" });
	await searchbox.waitFor({ state: "visible", timeout: 10000 });
	log.info("Searchbox visible, filling...");

	await humanFill(page, searchbox, location);
	log.info("Text entered, waiting for autocomplete options...");

	const firstOption = page.getByRole("option").first();
	await firstOption.waitFor({ state: "visible", timeout: 10000 });
	log.info("Autocomplete option visible, waiting for it to stabilize...");

	// Wait for the dropdown to settle — options can re-render as results arrive
	await humanDelay(page, 800);

	log.info("Clicking first autocomplete option...");
	await humanClick(page, firstOption);
	log.info({ url: page.url() }, "Location set");
}

export async function waitForListings(page: Page) {
	log.info("Waiting for listings table...");
	await page.waitForSelector("#srchrslt-adtable", { timeout: 15000 });
	await humanBrowse(page);
	log.info("Listings loaded");
}
