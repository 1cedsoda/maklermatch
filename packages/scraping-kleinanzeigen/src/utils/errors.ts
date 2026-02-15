import type { ScrapeResult } from "../flows/scrape-handler";

export class BrowserClosedError extends Error {
	readonly partialResult: ScrapeResult;

	constructor(partialResult: ScrapeResult, cause?: Error) {
		super("Browser closed unexpectedly during scraping");
		this.name = "BrowserClosedError";
		this.partialResult = partialResult;
		if (cause) {
			this.cause = cause;
		}
	}
}

export function isTargetClosedError(err: unknown): boolean {
	if (!(err instanceof Error)) return false;
	return (
		err.constructor?.name === "TargetClosedError" ||
		err.message.includes("Target page, context or browser has been closed")
	);
}
