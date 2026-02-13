import { MAX_INTERRUPTION_RESETS, SCHEDULER_POLL_INTERVAL_MS } from "./config";
import { DelayCalculator } from "./delay-calculator";
import { type JobStore, JobStatus } from "./job-store";
import type { MessageGenerator } from "./message-generator";
import { TimeWindow } from "./time-window";

export interface NewMessageChecker {
	hasNewMessage(conversationId: string, since: Date): Promise<boolean>;
}

export interface MessageSender {
	send(conversationId: string, message: string): Promise<void>;
}

export interface ConversationContext {
	getListingText(conversationId: string): Promise<string>;
	getListingId(conversationId: string): Promise<string>;
	getSellerName(conversationId: string): Promise<string>;
}

export interface ScheduleResult {
	jobId: string;
	delayMs: number;
	period: string;
	skipped: boolean;
}

export interface ReplySchedulerDeps {
	store: JobStore;
	generator: MessageGenerator;
	checker: NewMessageChecker;
	sender: MessageSender;
	context: ConversationContext;
	testMode?: boolean;
	/** Skip actual waiting (for unit tests). Delays are still computed and returned. */
	skipDelays?: boolean;
}

export class ReplyScheduler {
	private store: JobStore;
	private timeWindow = new TimeWindow();
	private delay: DelayCalculator;
	private generator: MessageGenerator;
	private checker: NewMessageChecker;
	private sender: MessageSender;
	private context: ConversationContext;
	private skipDelays: boolean;

	private activeTimers = new Map<string, Timer>();
	private pollHandle: Timer | null = null;
	private processing = new Set<string>();

	constructor(deps: ReplySchedulerDeps) {
		this.store = deps.store;
		this.generator = deps.generator;
		this.checker = deps.checker;
		this.sender = deps.sender;
		this.context = deps.context;
		this.delay = new DelayCalculator({ testMode: deps.testMode });
		this.skipDelays = deps.skipDelays ?? false;
	}

	schedule(
		conversationId: string,
		triggerMessageId: string,
		isFirstInConversation: boolean,
		interruptionCount = 0,
	): ScheduleResult {
		// Cancel any existing active job for this conversation
		this.cancelInternal(conversationId);

		// Compute base delay
		const base = this.delay.calculate(100, isFirstInConversation);

		// Apply time-of-day adjustment
		const adjusted = this.timeWindow.adjustDelay(base.delayMs);

		if (adjusted.skipped) {
			const job = this.store.create({
				conversationId,
				triggerMessageId,
				createdAt: new Date(),
				executeAfter: new Date(),
				status: JobStatus.SKIPPED,
				baseDelayMs: base.delayMs,
				adjustedDelayMs: 0,
				timePeriod: adjusted.period,
				interruptionCount,
				generatedMessage: null,
			});
			return {
				jobId: job.id,
				delayMs: 0,
				period: adjusted.period,
				skipped: true,
			};
		}

		const now = new Date();
		const job = this.store.create({
			conversationId,
			triggerMessageId,
			createdAt: now,
			executeAfter: new Date(now.getTime() + adjusted.delayMs),
			status: JobStatus.WAITING,
			baseDelayMs: base.delayMs,
			adjustedDelayMs: adjusted.delayMs,
			timePeriod: adjusted.period,
			interruptionCount,
			generatedMessage: null,
		});

		const effectiveDelay = this.skipDelays ? 0 : adjusted.delayMs;

		console.info(
			`[ReplyScheduler] ${conversationId}: delay=${adjusted.delayMs}ms (base=${base.delayMs}ms, period=${adjusted.period})${this.skipDelays ? " [skip]" : ""}`,
		);

		// Schedule in-memory timer
		const timer = setTimeout(() => {
			this.activeTimers.delete(job.id);
			this.processJob(job.id);
		}, effectiveDelay);
		this.activeTimers.set(job.id, timer);

		this.delay.markActive();

		return {
			jobId: job.id,
			delayMs: adjusted.delayMs,
			period: adjusted.period,
			skipped: false,
		};
	}

	cancel(conversationId: string): void {
		this.cancelInternal(conversationId);
	}

	startPolling(): void {
		if (this.pollHandle) return;
		this.pollHandle = setInterval(() => {
			const due = this.store.getDueJobs();
			for (const job of due) {
				if (!this.activeTimers.has(job.id) && !this.processing.has(job.id)) {
					this.processJob(job.id);
				}
			}
		}, SCHEDULER_POLL_INTERVAL_MS);
	}

	stopPolling(): void {
		if (this.pollHandle) {
			clearInterval(this.pollHandle);
			this.pollHandle = null;
		}
	}

	dispose(): void {
		this.stopPolling();
		for (const timer of this.activeTimers.values()) {
			clearTimeout(timer);
		}
		this.activeTimers.clear();
	}

	async processJob(jobId: string): Promise<void> {
		const job = this.store.get(jobId);
		if (!job || job.status !== JobStatus.WAITING) return;

		if (this.processing.has(jobId)) return;
		this.processing.add(jobId);

		try {
			await this.executeJob(job);
		} finally {
			this.processing.delete(jobId);
		}
	}

	private async executeJob(
		job: ReturnType<JobStore["get"]> & {},
	): Promise<void> {
		// --- CHECK 1: New message before generation? ---
		const hasNew = await this.checker.hasNewMessage(
			job.conversationId,
			job.createdAt,
		);
		if (hasNew) {
			if (job.interruptionCount < MAX_INTERRUPTION_RESETS) {
				this.store.update(job.id, { status: JobStatus.CANCELLED });
				this.schedule(
					job.conversationId,
					job.triggerMessageId,
					false,
					job.interruptionCount + 1,
				);
			} else {
				this.store.update(job.id, { status: JobStatus.CANCELLED });
			}
			return;
		}

		// --- GENERATE ---
		this.store.update(job.id, { status: JobStatus.GENERATING });

		const listingText = await this.context.getListingText(job.conversationId);
		const listingId = await this.context.getListingId(job.conversationId);
		const sellerName = await this.context.getSellerName(job.conversationId);

		const result = await this.generator.generate(
			listingText,
			listingId,
			"",
			sellerName,
		);

		if (result.skipped || !result.message) {
			this.store.update(job.id, { status: JobStatus.SKIPPED });
			return;
		}

		// --- CHECK 2: New message during generation? ---
		const hasNewAfterGen = await this.checker.hasNewMessage(
			job.conversationId,
			job.createdAt,
		);
		if (hasNewAfterGen) {
			if (job.interruptionCount < MAX_INTERRUPTION_RESETS) {
				this.store.update(job.id, { status: JobStatus.CANCELLED });
				this.schedule(
					job.conversationId,
					job.triggerMessageId,
					false,
					job.interruptionCount + 1,
				);
			} else {
				this.store.update(job.id, { status: JobStatus.CANCELLED });
			}
			return;
		}

		// --- TYPING DELAY ---
		this.store.update(job.id, {
			status: JobStatus.SENDING,
			generatedMessage: result.message.text,
		});

		const typingMs = Math.min(result.message.text.length * 55, 8000);
		if (!this.skipDelays) {
			await Bun.sleep(typingMs);
		}

		// --- CHECK 3: New message during typing delay? ---
		const hasNewFinal = await this.checker.hasNewMessage(
			job.conversationId,
			job.createdAt,
		);
		if (hasNewFinal) {
			if (job.interruptionCount < MAX_INTERRUPTION_RESETS) {
				this.store.update(job.id, { status: JobStatus.CANCELLED });
				this.schedule(
					job.conversationId,
					job.triggerMessageId,
					false,
					job.interruptionCount + 1,
				);
			} else {
				this.store.update(job.id, { status: JobStatus.CANCELLED });
			}
			return;
		}

		// --- SEND ---
		await this.sender.send(job.conversationId, result.message.text);
		this.store.update(job.id, { status: JobStatus.COMPLETED });
	}

	private cancelInternal(conversationId: string): void {
		const existing = this.store.getActiveForConversation(conversationId);
		if (existing) {
			const timer = this.activeTimers.get(existing.id);
			if (timer) {
				clearTimeout(timer);
				this.activeTimers.delete(existing.id);
			}
		}
		this.store.cancelForConversation(conversationId);
	}
}
