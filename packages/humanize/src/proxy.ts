import { readFileSync } from "fs";
import type { Proxy } from "./identity";
import { logger } from "./logger";

const log = logger.child({ module: "proxy" });

export function loadProxies(filePath: string): Proxy[] {
	const proxies = readFileSync(filePath, "utf-8")
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean)
		.map((line) => {
			const [host, port, username, password] = line.split(":");
			return { server: `http://${host}:${port}`, username, password };
		});
	log.info({ path: filePath, count: proxies.length }, "Loaded proxies");
	return proxies;
}
