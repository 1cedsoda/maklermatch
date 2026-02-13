import type { TimePeriod } from "./time-window";

export enum JobStatus {
	WAITING = "waiting",
	GENERATING = "generating",
	SENDING = "sending",
	COMPLETED = "completed",
	CANCELLED = "cancelled",
	SKIPPED = "skipped",
}

const TERMINAL_STATUSES: ReadonlySet<JobStatus> = new Set([
	JobStatus.COMPLETED,
	JobStatus.CANCELLED,
	JobStatus.SKIPPED,
]);

export interface ScheduledJob {
	id: string;
	conversationId: string;
	triggerMessageId: string;
	createdAt: Date;
	executeAfter: Date;
	status: JobStatus;
	baseDelayMs: number;
	adjustedDelayMs: number;
	timePeriod: TimePeriod;
	interruptionCount: number;
	generatedMessage: string | null;
}

export interface JobStore {
	create(job: Omit<ScheduledJob, "id">): ScheduledJob;
	get(id: string): ScheduledJob | null;
	getActiveForConversation(conversationId: string): ScheduledJob | null;
	update(id: string, updates: Partial<ScheduledJob>): void;
	getDueJobs(now?: Date): ScheduledJob[];
	cancelForConversation(conversationId: string): void;
}

export class InMemoryJobStore implements JobStore {
	private jobs = new Map<string, ScheduledJob>();
	private counter = 0;

	create(job: Omit<ScheduledJob, "id">): ScheduledJob {
		const id = `job_${++this.counter}`;
		const full: ScheduledJob = { ...job, id };
		this.jobs.set(id, full);
		return full;
	}

	get(id: string): ScheduledJob | null {
		return this.jobs.get(id) ?? null;
	}

	getActiveForConversation(conversationId: string): ScheduledJob | null {
		for (const job of this.jobs.values()) {
			if (
				job.conversationId === conversationId &&
				!TERMINAL_STATUSES.has(job.status)
			) {
				return job;
			}
		}
		return null;
	}

	update(id: string, updates: Partial<ScheduledJob>): void {
		const job = this.jobs.get(id);
		if (!job) return;
		Object.assign(job, updates);
	}

	getDueJobs(now = new Date()): ScheduledJob[] {
		const due: ScheduledJob[] = [];
		for (const job of this.jobs.values()) {
			if (job.status === JobStatus.WAITING && job.executeAfter <= now) {
				due.push(job);
			}
		}
		return due;
	}

	cancelForConversation(conversationId: string): void {
		for (const job of this.jobs.values()) {
			if (
				job.conversationId === conversationId &&
				!TERMINAL_STATUSES.has(job.status)
			) {
				job.status = JobStatus.CANCELLED;
			}
		}
	}
}
