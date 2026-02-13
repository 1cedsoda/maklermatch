import { type UIMessage, convertToModelMessages, streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { type BrokerInfo, buildSystemPrompt } from "./prompt";

export interface AgentConfig {
	apiKey?: string;
	model?: string;
	systemPrompt?: string;
	brokerProfile?: BrokerInfo;
}

function createProvider(apiKey?: string) {
	return createOpenAICompatible({
		name: "langdock",
		baseURL: "https://api.langdock.com/openai/eu/v1",
		apiKey: apiKey ?? process.env.LANGDOCK_API_KEY,
	});
}

export async function handleChatRequest(
	messages: UIMessage[],
	config: AgentConfig = {},
): Promise<Response> {
	const provider = createProvider(config.apiKey);
	const model = config.model ?? "claude-sonnet-4-5-20250929";

	const result = streamText({
		model: provider(model),
		system: config.systemPrompt ?? buildSystemPrompt(config.brokerProfile),
		messages: await convertToModelMessages(messages),
	});

	return result.toUIMessageStreamResponse();
}
