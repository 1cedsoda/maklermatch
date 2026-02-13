import { readFileSync } from "fs";
import type { Proxy } from "./identity";

export function loadProxies(filePath: string): Proxy[] {
	return readFileSync(filePath, "utf-8")
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean)
		.map((line) => {
			const [host, port, username, password] = line.split(":");
			return { server: `http://${host}:${port}`, username, password };
		});
}
