import { chromium } from "patchright";
import type { BrowserIdentity } from "@scraper/humanize";
import { logger } from "./logger";

const log = logger.child({ module: "browser" });

export async function launchBrowser(
	identity: BrowserIdentity,
	{ headless = process.env.HEADLESS !== "false" } = {},
) {
	// Force headless on Linux when no display is available
	if (!headless && process.platform === "linux" && !process.env.DISPLAY) {
		log.warn("No DISPLAY available, forcing headless mode");
		headless = true;
	}

	log.info(
		{
			proxy: identity.proxy.server,
			userAgent: identity.userAgent,
			headless,
			viewport: identity.viewport,
		},
		"Launching browser...",
	);

	const browser = await chromium.launch({
		headless,
		proxy: identity.proxy,
		args: [
			"--disable-blink-features=AutomationControlled",
			"--disable-features=WebRtcHideLocalIpsWithMdns",
			"--enforce-webrtc-ip-permission-check",
			"--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
		],
	});

	const context = await browser.newContext({
		viewport: identity.viewport,
		screen: identity.screen,
		deviceScaleFactor: identity.deviceScaleFactor,
		userAgent: identity.userAgent,
		locale: identity.locale,
		timezoneId: identity.timezoneId,
		extraHTTPHeaders: {
			"Accept-Language": identity.acceptLanguage,
		},
	});

	const page = await context.newPage();

	log.info("Browser launched");
	return { browser, context, page };
}
