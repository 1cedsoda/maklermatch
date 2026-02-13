import type { Page } from "patchright";

const BASE_URL = "https://www.kleinanzeigen.de";

export async function crawlAllPages(page: Page): Promise<string[]> {
	const pages: string[] = [];

	while (true) {
		const html = await page.content();
		pages.push(html);

		const nextUrl = await page.evaluate(() => {
			const el = document.querySelector<HTMLAnchorElement>("a.pagination-next");
			return el?.getAttribute("href") || null;
		});

		if (!nextUrl) break;

		console.log(`Page ${pages.length} done, navigating to next...`);
		await page.waitForTimeout(Math.random() * 2000 + 1000);
		await page.goto(`${BASE_URL}${nextUrl}`, { waitUntil: "domcontentloaded" });
		await page.waitForSelector("#srchrslt-adtable");
	}

	console.log(`Crawled ${pages.length} pages total.`);
	return pages;
}
