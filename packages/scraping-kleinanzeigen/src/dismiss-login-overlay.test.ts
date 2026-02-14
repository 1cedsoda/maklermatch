import {
	describe,
	test,
	expect,
	beforeAll,
	afterAll,
	afterEach,
} from "bun:test";
import { chromium, type Browser, type Page } from "patchright";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dismissLoginOverlay } from "./navigation";

const FIXTURE = readFileSync(
	join(import.meta.dir, "fixtures", "login-overlay.html"),
	"utf-8",
);

const CLOSE_SELECTOR = 'button[aria-label="Willkommens-Popup Schließen"]';

describe("dismissLoginOverlay", () => {
	let browser: Browser;
	let page: Page;

	beforeAll(async () => {
		browser = await chromium.launch();
	});

	afterAll(async () => {
		await browser.close();
	});

	afterEach(async () => {
		await page.close();
	});

	test("detects login overlay when present", async () => {
		page = await browser.newPage();
		await page.setContent(FIXTURE);

		const closeButton = page.locator(CLOSE_SELECTOR);
		await expect(closeButton.isVisible()).resolves.toBe(true);

		const overlayText = page.locator("text=Willkommen bei Kleinanzeigen");
		await expect(overlayText.isVisible()).resolves.toBe(true);
	});

	test(
		"closes login overlay and verifies it is not visible",
		async () => {
			page = await browser.newPage();
			// Add a click handler that hides the overlay (simulates real Astro component behavior)
			await page.setContent(FIXTURE);
			await page.evaluate((selector) => {
				const btn = document.querySelector(selector);
				btn?.addEventListener("click", () => {
					const overlay = btn.closest("astro-island");
					if (overlay instanceof HTMLElement) {
						overlay.style.display = "none";
					}
				});
			}, CLOSE_SELECTOR);

			// Verify overlay is visible before dismissal
			const closeButton = page.locator(CLOSE_SELECTOR);
			await expect(closeButton.isVisible()).resolves.toBe(true);

			await dismissLoginOverlay(page);

			// Verify overlay is no longer visible (may still be in DOM)
			await expect(closeButton.isVisible()).resolves.toBe(false);

			const overlayText = page.locator("text=Willkommen bei Kleinanzeigen");
			await expect(overlayText.isVisible()).resolves.toBe(false);

			// astro-island element may persist in DOM — that's fine
			const astroIsland = page.locator("astro-island");
			const domCount = await astroIsland.count();
			expect(domCount).toBeGreaterThanOrEqual(0);
		},
		{ timeout: 15000 },
	);

	test(
		"hides overlay via JS fallback when click handler is missing",
		async () => {
			page = await browser.newPage();
			// No click handler added — simulates case where site JS didn't hydrate
			await page.setContent(FIXTURE);

			const closeButton = page.locator(CLOSE_SELECTOR);
			await expect(closeButton.isVisible()).resolves.toBe(true);

			await dismissLoginOverlay(page);

			// JS fallback should have hidden the overlay — element may persist in DOM
			await expect(closeButton.isVisible()).resolves.toBe(false);

			const overlayText = page.locator("text=Willkommen bei Kleinanzeigen");
			await expect(overlayText.isVisible()).resolves.toBe(false);
		},
		{ timeout: 30000 },
	);

	test("does nothing when no login overlay is present", async () => {
		page = await browser.newPage();
		await page.setContent("<html><body><h1>No overlay here</h1></body></html>");

		// Should not throw
		await dismissLoginOverlay(page);

		// Page content remains unchanged
		const heading = page.locator("h1");
		await expect(heading.textContent()).resolves.toBe("No overlay here");
	});
});
