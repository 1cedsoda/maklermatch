import { createLLMClient } from "@scraper/agent";
import { MessageGenerator } from "@/messaging";
import type { MessagePersona } from "@/messaging";

const llmClient = createLLMClient();

export async function POST(req: Request) {
	const { listingText, listingId, persona } = (await req.json()) as {
		listingText: string;
		listingId?: string;
		persona?: MessagePersona;
	};

	const generator = new MessageGenerator(llmClient, { persona });
	const result = await generator.generate(listingText, listingId);

	if (result.skipped || !result.message) {
		return Response.json({ skipped: true }, { status: 200 });
	}

	return Response.json({
		text: result.message.text,
		variant: result.message.variant,
		score: result.message.spamGuardScore,
		attempt: result.message.generationAttempt,
		delayMs: result.delayMs,
	});
}
