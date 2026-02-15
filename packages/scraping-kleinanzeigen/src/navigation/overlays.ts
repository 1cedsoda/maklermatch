import type { Page } from "patchright";
import { humanClick, humanDelay, humanScroll } from "@scraper/humanize";
import { log } from "./shared";

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

const LOGIN_OVERLAY_CLOSE_SELECTOR =
	'button[aria-label="Willkommens-Popup Schließen"]';

export async function dismissLoginOverlay(page: Page) {
	log.info("Looking for login overlay...");
	try {
		const closeButton = page.locator(LOGIN_OVERLAY_CLOSE_SELECTOR);
		await closeButton.waitFor({ timeout: 3000 });

		log.info("Login overlay found, dismissing...");
		await humanDelay(page, 600);

		const overlayGone = async () => {
			await closeButton.waitFor({ state: "hidden", timeout: 3000 });
		};

		// Strategy 1: human-like click
		await humanClick(page, closeButton);
		try {
			await overlayGone();
			log.info("Login overlay dismissed");
			return;
		} catch {
			log.warn("Login overlay still visible after human click");
		}

		// Strategy 2: force click
		log.info("Retrying with force click...");
		await closeButton.click({ force: true });
		try {
			await overlayGone();
			log.info("Login overlay dismissed on force click");
			return;
		} catch {
			log.warn("Login overlay still visible after force click");
		}

		// Strategy 3: JS-level click, then hide as fallback
		log.info("Retrying with JS click...");
		await page.evaluate((selector) => {
			const btn = document.querySelector<HTMLElement>(selector);
			btn?.click();
		}, LOGIN_OVERLAY_CLOSE_SELECTOR);
		try {
			await overlayGone();
			log.info("Login overlay dismissed via JS click");
			return;
		} catch {
			log.warn("Login overlay still visible after JS click");
		}

		// Strategy 4: forcefully hide the overlay via JS
		log.info("Hiding login overlay via JS...");
		await page.evaluate((selector) => {
			const btn = document.querySelector<HTMLElement>(selector);
			const overlay = btn?.closest("astro-island") ?? btn?.closest("div");
			if (overlay instanceof HTMLElement) {
				overlay.style.display = "none";
			}
		}, LOGIN_OVERLAY_CLOSE_SELECTOR);
		log.info("Login overlay hidden via JS");
	} catch (err) {
		if (err instanceof Error && err.message.includes("Login overlay")) {
			throw err;
		}
		log.info("No login overlay appeared");
	}
}
