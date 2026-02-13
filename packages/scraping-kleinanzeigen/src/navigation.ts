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

		// After clicking, verify by checking the accept button is gone
		// (not the broad gdpr container — leftover DOM nodes with gdpr classes
		// can persist after the banner is dismissed).
		const bannerGone = async () => {
			await banner.waitFor({ state: "hidden", timeout: 5000 });
		};

		// Strategy 1: human-like click
		log.info("Banner found, clicking...");
		await humanClick(page, banner);
		try {
			await bannerGone();
			log.info("Cookie banner dismissed");
			return;
		} catch {
			log.warn("Cookie banner still visible after human click");
		}

		// Strategy 2: force click (bypasses actionability checks)
		log.info("Retrying with force click...");
		await banner.click({ force: true });
		try {
			await bannerGone();
			log.info("Cookie banner dismissed on force click");
			return;
		} catch {
			log.warn("Cookie banner still visible after force click");
		}

		// Strategy 3: JS-level click (avoids mouse/pointer issues entirely)
		log.info("Retrying with JS click...");
		await page.evaluate(() => {
			const btn = document.querySelector<HTMLElement>("#gdpr-banner-accept");
			btn?.click();
		});
		try {
			await bannerGone();
			log.info("Cookie banner dismissed via JS click");
			return;
		} catch {
			log.warn("Cookie banner still visible after JS click");
		}

		// All strategies failed — cannot continue with banner blocking the page
		throw new Error(
			"Failed to dismiss cookie banner after 3 attempts — banner is blocking page interactions",
		);
	} catch (err) {
		// Re-throw dismissal failures, only swallow "banner not found"
		if (err instanceof Error && err.message.includes("Failed to dismiss")) {
			throw err;
		}
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
	log.info(`Category page loaded: ${page.url()}`);

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
		const urlBefore = page.url();
		await humanClick(page, filterLink);

		try {
			await page.waitForURL((url) => url.toString() !== urlBefore, {
				timeout: 15000,
			});
		} catch {
			log.warn("URL did not change after clicking private filter");
		}
		await page.waitForLoadState("domcontentloaded");
		log.info(`Filtered to private listings: ${page.url()}`);
	} catch {
		log.warn("Private listing filter not available for this category");
	}

	await humanScroll(page, Math.round(100 + Math.random() * 150));
	await humanDelay(page, 800);
}

export async function setLocation(page: Page, location: string) {
	log.info({ location }, "Setting location...");
	const searchbox = page.getByRole("searchbox", { name: "PLZ oder Ort" });
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
			await firstOption.waitFor({ state: "visible", timeout: 10000 });
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

	if (autocompleteWorked) {
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
	} else {
		// Fallback: inject location into the current URL path.
		// Kleinanzeigen URLs support location slugs, e.g.
		//   /s-haus-kaufen/anbieter:privat/c208
		//   /s-haus-kaufen/berlin/anbieter:privat/c208
		log.warn(
			{ location },
			"Autocomplete failed after all attempts, falling back to URL navigation",
		);
		const locationSlug = location
			.toLowerCase()
			.replace(/\s+/g, "-")
			.replace(/[äÄ]/g, "ae")
			.replace(/[öÖ]/g, "oe")
			.replace(/[üÜ]/g, "ue")
			.replace(/ß/g, "ss")
			.replace(/[^a-z0-9-]/g, "");

		const currentUrl = new URL(page.url());
		const pathParts = currentUrl.pathname.split("/").filter(Boolean);
		// Insert location slug after the category prefix (e.g. "s-haus-kaufen")
		// but before any filters like "anbieter:privat" and the category id "c208"
		const categoryPrefixIdx = pathParts.findIndex((p) => p.startsWith("s-"));
		if (categoryPrefixIdx !== -1) {
			pathParts.splice(categoryPrefixIdx + 1, 0, locationSlug);
		} else {
			pathParts.push(locationSlug);
		}
		const newUrl = `${currentUrl.origin}/${pathParts.join("/")}`;
		log.info({ newUrl }, "Navigating to location URL...");
		await page.goto(newUrl, {
			waitUntil: "domcontentloaded",
			timeout: 60000,
		});
		log.info(`Location set via URL fallback: ${page.url()}`);
	}
}

export async function selectSorting(page: Page, sorting: string) {
	log.info({ sorting }, "Selecting sorting option...");
	const dropdown = page.locator("#sortingField-selector-inpt");
	try {
		await dropdown.waitFor({ state: "visible", timeout: 5000 });
	} catch {
		log.warn("Sorting dropdown not found, skipping");
		return;
	}

	// Check if already set to the desired sorting
	const currentValue = await page
		.locator("#sortingField-selector-value")
		.inputValue();
	if (currentValue === sorting) {
		log.info({ sorting }, "Sorting already set, skipping");
		return;
	}

	// Open the dropdown
	await humanClick(page, dropdown);
	await humanDelay(page, 400);

	// Click the desired option
	const option = page.locator(
		`#sortingField-selector-list li[data-value="${sorting}"]`,
	);
	try {
		await option.waitFor({ state: "visible", timeout: 5000 });
	} catch {
		log.warn({ sorting }, "Sorting option not found in dropdown");
		return;
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

	await humanDelay(page, 800);
}

export async function waitForListings(page: Page) {
	log.info("Waiting for listings table...");
	await page.waitForSelector("#srchrslt-adtable", { timeout: 15000 });
	await humanBrowse(page);
	log.info("Listings loaded");
}
