import { createLLMClient } from "@scraper/agent";
import { MessageGenerator } from "@/messaging";

const llmClient = createLLMClient();
const generator = new MessageGenerator(llmClient);

export async function POST(req: Request) {
	const { listingText, listingId } = (await req.json()) as {
		listingText: string;
		listingId?: string;
	};

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
