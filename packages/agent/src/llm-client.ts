import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { AgentConfig } from "./agent";

export interface LLMClient {
	generate(systemPrompt: string, userPrompt: string): Promise<string>;
}

export function createLLMClient(config: AgentConfig = {}): LLMClient {
	const anthropic = createAnthropic({
		apiKey: config.apiKey ?? process.env.ANTHROPIC_API_KEY,
	});
	const model = anthropic(config.model ?? "claude-sonnet-4-5-20250929");

	return {
		async generate(systemPrompt: string, userPrompt: string): Promise<string> {
			const result = await generateText({
				model,
				system: systemPrompt,
				prompt: userPrompt,
			});
			return result.text;
		},
	};
}
