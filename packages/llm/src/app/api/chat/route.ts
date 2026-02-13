import { handleChatRequest } from "@scraper/agent";
import type { BrokerInfo } from "@scraper/agent";
import type { UIMessage } from "ai";

export async function POST(req: Request) {
	const {
		messages,
		brokerProfile,
		listingText,
	}: {
		messages: UIMessage[];
		brokerProfile?: BrokerInfo;
		listingText?: string;
	} = await req.json();
	return handleChatRequest(messages, { brokerProfile, listingText });
}
