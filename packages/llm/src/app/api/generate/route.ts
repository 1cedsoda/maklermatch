import { createLLMClient } from "@scraper/agent";
import { MessageGenerator } from "@/messaging";
import type { CompanyCriteria, MessagePersona } from "@/messaging";

const llmClient = createLLMClient();

export async function POST(req: Request) {
	try {
		const { listingText, listingId, sellerName, persona, companyCriteria } =
			(await req.json()) as {
				listingText: string;
				listingId?: string;
				sellerName?: string;
				persona?: MessagePersona;
				companyCriteria?: CompanyCriteria;
			};

		if (!listingText) {
			return Response.json(
				{ error: "listingText is required" },
				{ status: 400 },
			);
		}

		const generator = new MessageGenerator(llmClient, {
			persona,
			companyCriteria,
		});
		const result = await generator.generate(
			listingText,
			listingId,
			"",
			sellerName,
		);

		if (result.skipped || !result.message) {
			return Response.json(
				{
					skipped: true,
					gateRejection: result.gateResult
						? {
								type: result.gateResult.rejectionType,
								reason: result.gateResult.rejectionReason,
							}
						: undefined,
				},
				{ status: 200 },
			);
		}

		return Response.json({
			text: result.message.text,
			score: result.message.spamGuardScore,
			attempt: result.message.generationAttempt,
			delayMs: result.delayMs,
		});
	} catch (err) {
		console.error("Generate route error:", err);
		const message = err instanceof Error ? err.message : "Unknown error";
		return Response.json({ error: message }, { status: 500 });
	}
}
