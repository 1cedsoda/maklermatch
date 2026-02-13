import { describe, expect, test } from "bun:test";
import { InMemoryJobStore, JobStatus } from "../job-store";
import { TimePeriod } from "../time-window";

function makeJob(
	conversationId: string,
	overrides: Record<string, unknown> = {},
) {
	return {
		conversationId,
		triggerMessageId: "msg_1",
		createdAt: new Date(),
		executeAfter: new Date(Date.now() + 60_000),
		status: JobStatus.WAITING,
		baseDelayMs: 30_000,
		adjustedDelayMs: 60_000,
		timePeriod: TimePeriod.BUSINESS_HOURS,
		interruptionCount: 0,
		generatedMessage: null,
		...overrides,
	};
}

describe("InMemoryJobStore", () => {
	test("create assigns unique IDs", () => {
		const store = new InMemoryJobStore();
		const a = store.create(makeJob("conv_1"));
		const b = store.create(makeJob("conv_2"));
		expect(a.id).not.toBe(b.id);
	});

	test("get returns the job by ID", () => {
		const store = new InMemoryJobStore();
		const job = store.create(makeJob("conv_1"));
		expect(store.get(job.id)).toBe(job);
	});

	test("get returns null for unknown ID", () => {
		const store = new InMemoryJobStore();
		expect(store.get("nonexistent")).toBeNull();
	});

	test("getActiveForConversation returns non-terminal job", () => {
		const store = new InMemoryJobStore();
		const job = store.create(makeJob("conv_1"));
		expect(store.getActiveForConversation("conv_1")).toBe(job);
	});

	test("getActiveForConversation ignores completed jobs", () => {
		const store = new InMemoryJobStore();
		store.create(makeJob("conv_1", { status: JobStatus.COMPLETED }));
		expect(store.getActiveForConversation("conv_1")).toBeNull();
	});

	test("getActiveForConversation ignores cancelled jobs", () => {
		const store = new InMemoryJobStore();
		store.create(makeJob("conv_1", { status: JobStatus.CANCELLED }));
		expect(store.getActiveForConversation("conv_1")).toBeNull();
	});

	test("update modifies job fields", () => {
		const store = new InMemoryJobStore();
		const job = store.create(makeJob("conv_1"));
		store.update(job.id, { status: JobStatus.GENERATING });
		expect(store.get(job.id)?.status).toBe(JobStatus.GENERATING);
	});

	test("getDueJobs returns only past-due WAITING jobs", () => {
		const store = new InMemoryJobStore();
		const past = new Date(Date.now() - 10_000);
		const future = new Date(Date.now() + 60_000);

		const due = store.create(makeJob("conv_1", { executeAfter: past }));
		store.create(makeJob("conv_2", { executeAfter: future }));
		store.create(
			makeJob("conv_3", {
				executeAfter: past,
				status: JobStatus.COMPLETED,
			}),
		);

		const result = store.getDueJobs();
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe(due.id);
	});

	test("cancelForConversation cancels all active jobs", () => {
		const store = new InMemoryJobStore();
		const a = store.create(makeJob("conv_1"));
		const b = store.create(makeJob("conv_1", { status: JobStatus.GENERATING }));
		store.create(makeJob("conv_1", { status: JobStatus.COMPLETED }));
		store.create(makeJob("conv_2")); // different conversation

		store.cancelForConversation("conv_1");

		expect(store.get(a.id)?.status).toBe(JobStatus.CANCELLED);
		expect(store.get(b.id)?.status).toBe(JobStatus.CANCELLED);
		// conv_2 unaffected
		expect(store.getActiveForConversation("conv_2")).not.toBeNull();
	});
});
