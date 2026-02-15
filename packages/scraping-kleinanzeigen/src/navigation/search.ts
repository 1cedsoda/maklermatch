import type { Page } from "patchright";
import { humanClick, humanDelay, humanBrowse } from "@scraper/humanize";
import { log } from "./shared";

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
