import type {
	RegisterPayload,
	ScrapeStartPayload,
	ScrapeStartAck,
	ScrapeResultPayload,
	ScrapeResultAck,
	ScrapeErrorPayload,
	ScrapeCancelPayload,
	ListingCheckPayload,
	ListingCheckAck,
	IngestListingsPayload,
	IngestListingsAck,
	LogLinePayload,
	ScraperTriggerPayload,
	MessageSendPayload,
	MessageSendResult,
} from "./lifecycle";

export const SocketEvents = {
	REGISTER: "register",
	SCRAPE_START: "scrape:start",
	SCRAPE_RESULT: "scrape:result",
	SCRAPE_ERROR: "scrape:error",
	SCRAPE_CANCEL: "scrape:cancel",
	LISTING_CHECK: "listing:check",
	INGEST_LISTINGS: "listing:ingest",
	SCRAPER_STATUS: "scraper:status",
	SCRAPER_TRIGGER: "scraper:trigger",
	SCRAPER_CANCEL_TASK: "scraper:cancel-task",
	MESSAGE_SEND: "message:send",
	LOG_LINE: "log:line",
} as const;

export interface ScraperToServerEvents {
	[SocketEvents.REGISTER]: (
		data: RegisterPayload,
		ack: (response: { ok: true }) => void,
	) => void;
	[SocketEvents.SCRAPE_START]: (
		data: ScrapeStartPayload,
		ack: (response: ScrapeStartAck) => void,
	) => void;
	[SocketEvents.SCRAPE_RESULT]: (
		data: ScrapeResultPayload,
		ack: (response: ScrapeResultAck) => void,
	) => void;
	[SocketEvents.SCRAPE_ERROR]: (
		data: ScrapeErrorPayload,
		ack: (response: { ok: true }) => void,
	) => void;
	[SocketEvents.SCRAPE_CANCEL]: (
		data: ScrapeCancelPayload,
		ack: (response: { ok: true }) => void,
	) => void;
	[SocketEvents.LISTING_CHECK]: (
		data: ListingCheckPayload,
		ack: (response: ListingCheckAck) => void,
	) => void;
	[SocketEvents.INGEST_LISTINGS]: (
		data: IngestListingsPayload,
		ack: (response: IngestListingsAck) => void,
	) => void;
	[SocketEvents.LOG_LINE]: (data: LogLinePayload) => void;
}

export interface ScraperStatusAck {
	isRunning: boolean;
	runningTaskCount: number;
	maxConcurrency: number;
	activeTasks: number[];
	lastRunAt: string | null;
	memoryMb?: {
		rss: number;
		heapUsed: number;
		heapTotal: number;
	};
}

export interface ServerToScraperEvents {
	[SocketEvents.SCRAPER_STATUS]: (
		ack: (response: ScraperStatusAck) => void,
	) => void;
	[SocketEvents.SCRAPER_TRIGGER]: (
		data: ScraperTriggerPayload,
		ack: (response: { ok: true } | { error: string }) => void,
	) => void;
	[SocketEvents.SCRAPER_CANCEL_TASK]: (
		data: { taskId: number },
		ack: (response: { ok: true } | { error: string }) => void,
	) => void;
	[SocketEvents.MESSAGE_SEND]: (
		data: MessageSendPayload,
		ack: (response: MessageSendResult) => void,
	) => void;
}
