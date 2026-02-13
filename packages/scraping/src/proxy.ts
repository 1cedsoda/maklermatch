import { readFileSync } from "fs";
import { join } from "path";
import type { Page } from "patchright";
import type { Result } from "./result";

export interface Proxy {
	server: string;
	username: string;
	password: string;
}

const PROXIES: Proxy[] = readFileSync(
	join(import.meta.dir, "proxies.txt"),
	"utf-8",
)
	.split("\n")
	.map((l) => l.trim())
	.filter(Boolean)
	.map((line) => {
		const [host, port, username, password] = line.split(":");
		return { server: `http://${host}:${port}`, username, password };
	});

export function randomProxy(): Proxy {
	return PROXIES[Math.floor(Math.random() * PROXIES.length)];
}

export async function verifyProxy(page: Page): Promise<Result<string>> {
	try {
		console.log("Verifying proxy connection...");
		await page.goto("https://api.ipify.org?format=json", { timeout: 15000 });
		const ip = (await page.textContent("body")) ?? "unknown";
		console.log(`Current IP: ${ip}`);
		return { ok: true, value: ip };
	} catch (e) {
		return { ok: false, error: e as Error };
	}
}
