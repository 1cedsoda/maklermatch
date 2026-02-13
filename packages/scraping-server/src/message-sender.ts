import { join } from "node:path";
import { generateIdentity, loadProxies } from "@scraper/humanize";
import {
	launchBrowser,
	dismissCookieBanner,
} from "@scraper/scraping-kleinanzeigen";
import { humanClick, humanFill, humanDelay } from "@scraper/humanize";
import type { MessageSendPayload, MessageSendResult } from "@scraper/api-types";
import { logger } from "./logger";

const log = logger.child({ module: "message-sender" });

const PROXIES_PATH = join(import.meta.dir, "..", "proxies.txt");

const KLEINANZEIGEN_LOGIN_URL = "https://www.kleinanzeigen.de/m-einloggen.html";

function getCredentials(): { email: string; password: string } {
	const email = process.env.KLEINANZEIGEN_EMAIL;
	const password = process.env.KLEINANZEIGEN_PASSWORD;
	if (!email || !password) {
		throw new Error(
			"KLEINANZEIGEN_EMAIL and KLEINANZEIGEN_PASSWORD must be set",
		);
	}
	return { email, password };
}

export async function sendMessage(
	payload: MessageSendPayload,
): Promise<MessageSendResult> {
	const { jobId, kleinanzeigenConversationId, message } = payload;

	log.info(
		{ jobId, conversationId: kleinanzeigenConversationId },
		"Sending message via browser",
	);

	const credentials = getCredentials();
	const identity = await generateIdentity(loadProxies(PROXIES_PATH));
	const { browser, page } = await launchBrowser(identity);

	try {
		// ── Login ──
		log.info("Navigating to login page...");
		await page.goto(KLEINANZEIGEN_LOGIN_URL, {
			waitUntil: "domcontentloaded",
			timeout: 30_000,
		});

		await dismissCookieBanner(page);
		await humanDelay(page, 800);

		log.info("Filling login form...");
		const emailInput = page.locator("#login-email");
		await emailInput.waitFor({ state: "visible", timeout: 10_000 });
		await humanFill(page, emailInput, credentials.email);

		await humanDelay(page, 400);

		const passwordInput = page.locator("#login-password");
		await humanFill(page, passwordInput, credentials.password);

		await humanDelay(page, 600);

		log.info("Submitting login...");
		const loginButton = page.locator("#login-submit");
		await humanClick(page, loginButton);

		await page.waitForLoadState("domcontentloaded");
		await humanDelay(page, 1500);

		// Check if login succeeded by looking for user menu or redirect
		const loggedIn =
			page.url().includes("meinkonto") ||
			page.url().includes("kleinanzeigen.de/") ||
			(await page
				.locator("#my-kleinanzeigen")
				.isVisible()
				.catch(() => false));

		if (!loggedIn && page.url().includes("einloggen")) {
			throw new Error("Login failed - still on login page");
		}

		log.info({ url: page.url() }, "Login successful");

		// ── Navigate to conversation ──
		const conversationUrl = `https://www.kleinanzeigen.de/m-nachrichten.html?conversationId=${kleinanzeigenConversationId}`;
		log.info({ url: conversationUrl }, "Navigating to conversation...");
		await page.goto(conversationUrl, {
			waitUntil: "domcontentloaded",
			timeout: 30_000,
		});
		await humanDelay(page, 1200);

		// ── Type and send message ──
		log.info("Looking for message input...");
		const messageInput = page.locator(
			'textarea[name="message"], #viewad-contact-form textarea, .MessageThread--ReplyBox textarea, textarea[data-testid="message-input"]',
		);
		await messageInput.waitFor({ state: "visible", timeout: 15_000 });

		await humanClick(page, messageInput);
		await humanDelay(page, 300);
		await humanFill(page, messageInput, message);
		await humanDelay(page, 800);

		log.info("Clicking send button...");
		const sendButton = page.locator(
			'button[type="submit"], button:has-text("Nachricht senden"), button:has-text("Senden"), button[data-testid="message-send"]',
		);
		await sendButton.waitFor({ state: "visible", timeout: 10_000 });
		await humanClick(page, sendButton);

		// Wait for message to be sent
		await humanDelay(page, 2000);
		await page.waitForLoadState("domcontentloaded");

		log.info(
			{ jobId, conversationId: kleinanzeigenConversationId },
			"Message sent successfully",
		);

		return { ok: true, jobId };
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		log.error(
			{ err, jobId, conversationId: kleinanzeigenConversationId },
			"Failed to send message",
		);
		return { ok: false, jobId, error: errorMessage };
	} finally {
		await browser.close();
	}
}
