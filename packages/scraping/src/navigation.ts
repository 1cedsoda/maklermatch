import type { Page } from "patchright";

export async function searchViaStartpage(page: Page): Promise<Page> {
	console.log("Navigating to Startpage...");
	await page.goto("https://www.startpage.com/", {
		waitUntil: "domcontentloaded",
		timeout: 60000,
	});
	console.log(`Page loaded: ${page.url()}`);

	await page
		.getByRole("search", { name: "top search bar" })
		.getByLabel("search button")
		.click();
	await page.getByPlaceholder("Privat suchen").click();
	await page.getByPlaceholder("Privat suchen").fill("kleinanzeigen");
	await page.getByRole("button", { name: "suggestion" }).first().click();

	const popupPromise = page.waitForEvent("popup");
	await page
		.getByText("https://www.kleinanzeigen.de/https://www.kleinanzeigen.de")
		.click();

	return popupPromise;
}

export async function dismissCookieBanner(page: Page) {
	try {
		const banner = page.locator("#gdpr-banner-accept");
		await banner.waitFor({ timeout: 10000 });
		await banner.click();
		console.log("Cookie banner dismissed.");
	} catch {
		console.log("No cookie banner appeared.");
	}
}

export async function navigateToCategory(page: Page) {
	await page
		.getByRole("group")
		.filter({ hasText: "Mehr ... Badezimmer Büro" })
		.locator("summary")
		.click();
	await page
		.getByRole("group")
		.filter({ hasText: "Mehr ... Häuser zum Kauf Auf" })
		.locator("summary")
		.click();
	await page.getByRole("link", { name: "Häuser zum Kauf" }).click();
	await page.waitForLoadState("load");
}

export async function filterPrivateListings(page: Page) {
	await page.locator(".browsebox-itemlist a[href*='anbieter:privat']").click();
	await page.waitForLoadState("load");
	console.log("Filtered to private listings.");
}

export async function setLocation(page: Page, location: string) {
	await page.getByRole("searchbox", { name: "PLZ oder Ort" }).click();
	await page.getByRole("searchbox", { name: "PLZ oder Ort" }).fill(location);
	await page.getByRole("option").first().click();
}

export async function waitForListings(page: Page) {
	await page.waitForSelector("#srchrslt-adtable");
	await page.waitForTimeout(Math.random() * 1000 + 1000);
	console.log("Listings loaded.");
}
