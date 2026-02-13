import { logger } from "./logger";
import { randomUserAgent } from "./useragent";
import { randomViewport } from "./viewport";

const log = logger.child({ module: "identity" });

export interface Proxy {
	server: string;
	username: string;
	password: string;
}

export interface BrowserIdentity {
	userAgent: string;
	viewport: { width: number; height: number };
	screen: { width: number; height: number };
	deviceScaleFactor: number;
	locale: string;
	timezoneId: string;
	acceptLanguage: string;
	proxy: Proxy;
}

async function verifyProxy(proxy: Proxy): Promise<boolean> {
	try {
		const url = new URL(proxy.server);
		url.username = proxy.username;
		url.password = proxy.password;

		const response = await fetch("https://api.ipify.org?format=json", {
			proxy: url.toString(),
			signal: AbortSignal.timeout(15000),
		} as RequestInit);

		return response.ok;
	} catch {
		return false;
	}
}

function pickRandom<T>(items: T[]): T {
	return items[Math.floor(Math.random() * items.length)];
}

export async function generateIdentity(
	proxies: Proxy[],
	maxRetries = 5,
): Promise<BrowserIdentity> {
	if (proxies.length === 0) {
		throw new Error("No proxies provided");
	}
	log.info({ proxies: proxies.length }, "Generating browser identity");

	let proxy: Proxy | undefined;
	const tried = new Set<number>();

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		let idx: number;
		if (tried.size >= proxies.length) {
			tried.clear();
		}
		do {
			idx = Math.floor(Math.random() * proxies.length);
		} while (tried.has(idx));
		tried.add(idx);

		const candidate = proxies[idx];
		log.debug(
			{ attempt: attempt + 1, server: candidate.server },
			"Verifying proxy",
		);
		if (await verifyProxy(candidate)) {
			proxy = candidate;
			break;
		}
		log.warn(
			{ attempt: attempt + 1, server: candidate.server },
			"Proxy verification failed",
		);
	}

	if (!proxy) {
		throw new Error(`Failed to verify any proxy after ${maxRetries} attempts`);
	}

	const viewport = randomViewport();
	log.info({ server: proxy.server, viewport }, "Identity generated");

	return {
		userAgent: randomUserAgent(),
		viewport,
		screen: viewport,
		deviceScaleFactor: Math.random() < 0.7 ? 1 : 2,
		locale: "de-DE",
		timezoneId: "Europe/Berlin",
		acceptLanguage: "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
		proxy,
	};
}
