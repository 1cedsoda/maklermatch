import { SAFEGUARD_ENABLED } from "./config";
import type { LLMClient } from "./message-generator";

export interface SafeguardResult {
	passed: boolean;
	reason: string | null;
}

const SAFEGUARD_PROMPT = `\
Du bist ein Detektor für KI-generierte Texte. Du bekommst eine kurze Nachricht \
die angeblich ein Mensch auf dem Handy getippt hat.

Prüfe auf diese AI-Tells:
- Gedankenstriche jeder Art (—, --, –) als Stilmittel
- Perfekte Zeichensetzung und Grammatik überall
- Zu "polierte" Formulierungen, die kein Mensch tippen würde
- Listen, Aufzählungen, Markdown
- Typische AI-Floskeln ("Gerne!", "Selbstverständlich!", "Das ist eine tolle Frage!")
- Unnatürlich strukturierte Sätze
- Jeder Satz perfekt ausformuliert (echte Menschen tippen manchmal kürzer)

Antworte mit GENAU einem Wort:
- "JA" wenn das ein Mensch getippt haben könnte
- "NEIN" wenn das nach AI klingt

Danach in einer neuen Zeile ein kurzer Grund (max 10 Wörter).`;

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
			const response = await this.llm.generate(SAFEGUARD_PROMPT, message);
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
