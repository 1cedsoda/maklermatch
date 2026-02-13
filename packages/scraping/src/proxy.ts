import { readFileSync } from "fs";
import { join } from "path";
import type { Proxy } from "@scraper/humanize";
import { logger } from "./logger";

const log = logger.child({ module: "proxy" });

export type { Proxy };

export function loadProxies(): Proxy[] {
	const proxies = readFileSync(join(import.meta.dir, "proxies.txt"), "utf-8")
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean)
		.map((line) => {
			const [host, port, username, password] = line.split(":");
			return { server: `http://${host}:${port}`, username, password };
		});

	log.info({ proxyCount: proxies.length }, "Loaded proxies");
	return proxies;
}
