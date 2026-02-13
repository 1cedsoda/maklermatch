export interface UserMessage {
	readonly role: "user";
	readonly content: string;
	readonly timestamp: string;
}

export interface AgentMessage {
	readonly role: "assistant";
	readonly content: string;
	readonly timestamp: string;
}

export type ChatMessage = UserMessage | AgentMessage;

export function createUserMessage(content: string): UserMessage {
	return {
		role: "user",
		content,
		timestamp: new Date().toISOString(),
	};
}

export function createAgentMessage(content: string): AgentMessage {
	return {
		role: "assistant",
		content,
		timestamp: new Date().toISOString(),
	};
}
