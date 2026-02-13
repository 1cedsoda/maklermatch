import type { Socket } from "socket.io-client";
import {
	SocketEvents,
	type ScrapeStartAck,
	type ScrapeResultAck,
	type ListingCheckItem,
	type ListingCheckAck,
	type IngestListingsAck,
	type ServerToScraperEvents,
	type ScraperToServerEvents,
	type IngestListing,
} from "@scraper/api-types";

type TypedSocket = Socket<ServerToScraperEvents, ScraperToServerEvents>;

const RECONNECT_TIMEOUT = 60_000;

export class ApiClient {
	constructor(private socket: TypedSocket) {}

	private waitForConnection(timeout: number): Promise<void> {
		if (this.socket.connected) return Promise.resolve();
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.socket.off("connect", onConnect);
				reject(new Error(`Reconnection timeout after ${timeout}ms`));
			}, timeout);
			const onConnect = () => {
				clearTimeout(timer);
				resolve();
			};
			this.socket.once("connect", onConnect);
		});
	}

	async scrapeStart(
		targetId: number,
		opts?: { maxPages?: number },
	): Promise<ScrapeStartAck> {
		await this.waitForConnection(RECONNECT_TIMEOUT);
		return this.socket.timeout(10000).emitWithAck(SocketEvents.SCRAPE_START, {
			targetId,
			maxPages: opts?.maxPages,
		});
	}

	async scrapeResult(
		taskId: number,
		pagesScraped: number,
		listingsFound: number,
		detailsScraped: number,
		detailsFailed: number,
		listings: IngestListing[],
	): Promise<ScrapeResultAck> {
		await this.waitForConnection(RECONNECT_TIMEOUT);
		return this.socket.timeout(30000).emitWithAck(SocketEvents.SCRAPE_RESULT, {
			taskId,
			pagesScraped,
			listingsFound,
			detailsScraped,
			detailsFailed,
			listings,
		});
	}

	async listingCheck(
		city: string,
		listings: ListingCheckItem[],
	): Promise<ListingCheckAck> {
		await this.waitForConnection(RECONNECT_TIMEOUT);
		return this.socket
			.timeout(30000)
			.emitWithAck(SocketEvents.LISTING_CHECK, { city, listings });
	}

	async ingestListings(
		city: string,
		listings: IngestListing[],
	): Promise<IngestListingsAck> {
		await this.waitForConnection(RECONNECT_TIMEOUT);
		return this.socket
			.timeout(30000)
			.emitWithAck(SocketEvents.INGEST_LISTINGS, { city, listings });
	}

	async scrapeError(taskId: number, errorMessage: string): Promise<void> {
		await this.waitForConnection(RECONNECT_TIMEOUT);
		await this.socket
			.timeout(10000)
			.emitWithAck(SocketEvents.SCRAPE_ERROR, { taskId, errorMessage });
	}

	async scrapeCancel(taskId: number): Promise<void> {
		await this.socket
			.timeout(5000)
			.emitWithAck(SocketEvents.SCRAPE_CANCEL, { taskId });
	}
}
