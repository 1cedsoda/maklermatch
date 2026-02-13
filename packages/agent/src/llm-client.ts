import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { AgentConfig } from "./agent";

export interface LLMClient {
	generate(systemPrompt: string, userPrompt: string): Promise<string>;
}

export function createLLMClient(config: AgentConfig = {}): LLMClient {
	const provider = createOpenAICompatible({
		name: "langdock",
		baseURL: "https://api.langdock.com/openai/eu/v1",
		apiKey: config.apiKey ?? process.env.LANGDOCK_API_KEY,
	});
	const model = provider(config.model ?? "claude-sonnet-4-5-20250929");

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
