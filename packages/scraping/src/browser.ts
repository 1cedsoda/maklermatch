import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import type { Browser, BrowserContext, Page } from "patchright";
import type { Result } from "./result";
import { retry } from "./retry";
import { randomProxy, verifyProxy } from "./proxy";
import { randomUserAgent } from "./useragent";

chromium.use(stealth());

export async function launchBrowser() {
	const userAgent = randomUserAgent();
	const proxy = randomProxy();
	console.log("Launching stealth browser with proxy...");
	console.log(`Proxy: ${proxy.server}`);
	console.log(`User-Agent: ${userAgent}`);

	const browser = await chromium.launch({
		headless: false,
		proxy,
	});

	const context = await browser.newContext({
		viewport: { width: 1920, height: 1080 },
		userAgent,
		locale: "de-DE",
		timezoneId: "Europe/Berlin",
	});

	await context.route("**/*", (route) => {
		const type = route.request().resourceType();
		if (type === "image" || type === "media" || type === "font") {
			return route.abort();
		}
		return route.continue();
	});

	return { browser, context };
}

type VerifiedBrowser = {
	browser: Browser;
	context: BrowserContext;
	page: Page;
};

export async function launchProxifiedBrowser(
	maxRetries = 5,
): Promise<Result<VerifiedBrowser>> {
	return retry<VerifiedBrowser>(
		async () => {
			const launched = await launchBrowser();
			const page = (await launched.context.newPage()) as unknown as Page;
			const browser = launched.browser as unknown as Browser;
			const context = launched.context as unknown as BrowserContext;

			const result = await verifyProxy(page);
			if (result.ok) {
				return { ok: true, value: { browser, context, page } };
			}

			await browser.close();
			return { ok: false, error: result.error };
		},
		maxRetries,
		(error, attempt) => {
			console.warn(`Attempt ${attempt} failed: ${error.message}`);
		},
	);
}
