export type { UserMessage, AgentMessage, ChatMessage } from "./types";
export { createUserMessage, createAgentMessage } from "./types";

export { handleChatRequest } from "./agent";
export type { AgentConfig } from "./agent";

export { buildSystemPrompt } from "./prompt";
export type { BrokerInfo } from "./prompt";

export { createLLMClient } from "./llm-client";
export type { LLMClient } from "./llm-client";

export {
	IDENTITY,
	STYLE_RULES,
	CHAT_CHARACTER,
	TASK_INITIAL,
	TASK_FOLLOWUP_1,
	TASK_FOLLOWUP_2,
	SAFEGUARD,
	LISTING_GATE,
	QUALITY_CHECK,
	injectPersona,
	extractVorname,
} from "./prompts";
