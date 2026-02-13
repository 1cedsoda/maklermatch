import { describe, expect, mock, test } from "bun:test";
import { InMemoryJobStore, JobStatus } from "../job-store";
import type { LLMClient } from "../message-generator";
import { MessageGenerator } from "../message-generator";
import {
	type ConversationContext,
	type MessageSender,
	type NewMessageChecker,
	ReplyScheduler,
} from "../reply-scheduler";

// The MessageGenerator calls the LLM in this order per generate() cycle:
// 1. ListingGate -> expects "JA\n..."
// 2. Message generation -> expects actual message text
// 3. SpamGuard quality -> expects a number like "8"
// 4. Safeguard -> expects "JA\n..."
const DEFAULT_RESPONSES = [
	"JA\nPasst.",
	"Hey Thomas, die Wohnung in Mitte mit 85 m² klingt gut. Steht der Preis fest?",
	"8",
	"JA\nKlingt menschlich.",
];

const SKIP_RESPONSES = ["JA\nPasst.", "[SKIP]"];

function createMockLLM(responses?: string[]): LLMClient {
	const queue = responses ?? DEFAULT_RESPONSES;
	let callIndex = 0;
	return {
		generate: mock(async () => {
			const response = queue[callIndex % queue.length];
			callIndex++;
			return response;
		}),
	};
}

function createMockChecker(hasNew = false): NewMessageChecker & {
	setHasNew: (v: boolean) => void;
} {
	let _hasNew = hasNew;
	return {
		hasNewMessage: mock(async () => _hasNew),
		setHasNew(v: boolean) {
			_hasNew = v;
		},
	};
}

function createMockSender(): MessageSender & { calls: string[] } {
	const calls: string[] = [];
	return {
		calls,
		send: mock(async (_id: string, msg: string) => {
			calls.push(msg);
		}),
	};
}

function createMockContext(): ConversationContext {
	return {
		getListingText: mock(
			async () =>
				"Schöne 3-Zimmer-Wohnung mit Balkon\n10115 Berlin - Mitte\nWohnfläche: 85 m²\nZimmer: 3\nKaufpreis: 350.000 €\nBalkon, Einbauküche, ruhige Lage",
		),
		getListingId: mock(async () => "listing_1"),
		getSellerName: mock(async () => "Thomas Müller"),
	};
}

function createScheduler(
	overrides: {
		checker?: NewMessageChecker;
		sender?: MessageSender;
		llmResponses?: string[];
	} = {},
) {
	const store = new InMemoryJobStore();
	const llm = createMockLLM(overrides.llmResponses);
	const generator = new MessageGenerator(llm, { testMode: true });
	const checker = overrides.checker ?? createMockChecker(false);
	const sender = overrides.sender ?? createMockSender();
	const context = createMockContext();

	const scheduler = new ReplyScheduler({
		store,
		generator,
		checker,
		sender,
		context,
		testMode: true,
		skipDelays: true,
	});

	return { scheduler, store, llm, checker, sender, context };
}

describe("ReplyScheduler", () => {
	test("schedule creates a job in WAITING status", () => {
		const { scheduler, store } = createScheduler();
		const result = scheduler.schedule("conv_1", "msg_1", true);

		expect(result.skipped).toBe(false);
		expect(result.jobId).toBeTruthy();

		const job = store.get(result.jobId);
		expect(job).not.toBeNull();
		expect(job!.status).toBe(JobStatus.WAITING);
		expect(job!.conversationId).toBe("conv_1");

		scheduler.dispose();
	});

	test("schedule cancels existing active job for same conversation", () => {
		const { scheduler, store } = createScheduler();
		const first = scheduler.schedule("conv_1", "msg_1", true);
		const second = scheduler.schedule("conv_1", "msg_2", false);

		expect(store.get(first.jobId)!.status).toBe(JobStatus.CANCELLED);
		expect(store.get(second.jobId)!.status).toBe(JobStatus.WAITING);

		scheduler.dispose();
	});

	test("cancel marks job as cancelled", () => {
		const { scheduler, store } = createScheduler();
		const result = scheduler.schedule("conv_1", "msg_1", true);

		scheduler.cancel("conv_1");

		expect(store.get(result.jobId)!.status).toBe(JobStatus.CANCELLED);
		scheduler.dispose();
	});

	test("processJob generates and sends message when no interruption", async () => {
		const sender = createMockSender();
		const { scheduler, store } = createScheduler({ sender });
		const result = scheduler.schedule("conv_1", "msg_1", true);

		// Manually trigger processing
		await scheduler.processJob(result.jobId);

		expect(store.get(result.jobId)!.status).toBe(JobStatus.COMPLETED);
		expect(sender.calls.length).toBe(1);

		scheduler.dispose();
	});

	test("processJob resets when new message detected before generation", async () => {
		const checker = createMockChecker(true); // always has new message
		const sender = createMockSender();
		const { scheduler, store } = createScheduler({ checker, sender });
		const result = scheduler.schedule("conv_1", "msg_1", true);

		await scheduler.processJob(result.jobId);

		// Original job should be cancelled
		expect(store.get(result.jobId)!.status).toBe(JobStatus.CANCELLED);
		// A new job should have been created
		const newJob = store.getActiveForConversation("conv_1");
		expect(newJob).not.toBeNull();
		expect(newJob!.interruptionCount).toBe(1);
		// Sender should NOT have been called
		expect(sender.calls.length).toBe(0);

		scheduler.dispose();
	});

	test("processJob stops rescheduling after max interruption resets", async () => {
		const checker = createMockChecker(true);
		const sender = createMockSender();
		const { scheduler, store } = createScheduler({ checker, sender });

		// Schedule with interruptionCount already at max
		const result = scheduler.schedule("conv_1", "msg_1", true, 3);

		await scheduler.processJob(result.jobId);

		expect(store.get(result.jobId)!.status).toBe(JobStatus.CANCELLED);
		// No new job should be created
		expect(store.getActiveForConversation("conv_1")).toBeNull();
		expect(sender.calls.length).toBe(0);

		scheduler.dispose();
	});

	test("processJob skips if LLM returns skip token", async () => {
		const sender = createMockSender();
		const { scheduler, store } = createScheduler({
			sender,
			llmResponses: SKIP_RESPONSES,
		});
		const result = scheduler.schedule("conv_1", "msg_1", true);

		await scheduler.processJob(result.jobId);

		expect(store.get(result.jobId)!.status).toBe(JobStatus.SKIPPED);
		expect(sender.calls.length).toBe(0);

		scheduler.dispose();
	});

	test("processJob is idempotent for non-WAITING jobs", async () => {
		const sender = createMockSender();
		const { scheduler, store } = createScheduler({ sender });
		const result = scheduler.schedule("conv_1", "msg_1", true);

		store.update(result.jobId, { status: JobStatus.COMPLETED });

		await scheduler.processJob(result.jobId);
		// Should not send again
		expect(sender.calls.length).toBe(0);

		scheduler.dispose();
	});

	test("different conversations don't interfere", () => {
		const { scheduler, store } = createScheduler();

		const a = scheduler.schedule("conv_1", "msg_1", true);
		const b = scheduler.schedule("conv_2", "msg_2", true);

		expect(store.get(a.jobId)!.status).toBe(JobStatus.WAITING);
		expect(store.get(b.jobId)!.status).toBe(JobStatus.WAITING);

		scheduler.cancel("conv_1");
		expect(store.get(a.jobId)!.status).toBe(JobStatus.CANCELLED);
		expect(store.get(b.jobId)!.status).toBe(JobStatus.WAITING);

		scheduler.dispose();
	});

	test("schedule passes interruptionCount through", () => {
		const { scheduler, store } = createScheduler();
		const result = scheduler.schedule("conv_1", "msg_1", false, 2);

		const job = store.get(result.jobId);
		expect(job!.interruptionCount).toBe(2);

		scheduler.dispose();
	});

	test("dispose clears all timers", () => {
		const { scheduler } = createScheduler();
		scheduler.schedule("conv_1", "msg_1", true);
		scheduler.schedule("conv_2", "msg_2", true);
		scheduler.startPolling();

		// Should not throw
		scheduler.dispose();
	});
});
