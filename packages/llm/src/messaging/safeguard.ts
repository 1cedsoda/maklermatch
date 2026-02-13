import { SAFEGUARD } from "@scraper/agent";
import { SAFEGUARD_ENABLED } from "./config";
import type { LLMClient } from "./message-generator";

export interface SafeguardResult {
	passed: boolean;
	reason: string | null;
}

export class Safeguard {
	private llm: LLMClient;

	constructor(llmClient: LLMClient) {
		this.llm = llmClient;
	}

	async check(message: string): Promise<SafeguardResult> {
		if (!SAFEGUARD_ENABLED) {
			return { passed: true, reason: null };
		}

		try {
			const response = await this.llm.generate(SAFEGUARD, message);
			const firstLine = response.trim().split("\n")[0].trim().toUpperCase();

			if (firstLine === "JA" || firstLine.startsWith("JA")) {
				return { passed: true, reason: null };
			}

			// Extract reason from second line if available
			const lines = response.trim().split("\n");
			const reason =
				lines.length > 1
					? lines[1].trim()
					: "Safeguard: Nachricht klingt nicht menschlich";

			return { passed: false, reason };
		} catch {
			// If safeguard fails, let the message through -- better than blocking
			return { passed: true, reason: null };
		}
	}
}
