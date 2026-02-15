import { Result } from "typescript-result";
import { logger } from "../utils/logger";

export const log = logger.child({ module: "navigation" });

export const DEFAULT_RETRIES = 3;

export interface NavigationOptions {
	/** Total number of attempts (default: 3). */
	retries?: number;
}

export async function withRetry(
	fn: (attempt: number) => Promise<Result<void, Error>>,
	retries: number,
	context: string,
): Promise<Result<void, Error>> {
	let lastResult: Result<void, Error> = Result.error(
		new Error("No attempts made"),
	);
	for (let attempt = 1; attempt <= retries; attempt++) {
		lastResult = await fn(attempt);
		if (lastResult.ok) return lastResult;
		if (attempt < retries) {
			log.warn(
				{ attempt, retries, context, err: lastResult.error },
				"Navigation step failed, retrying...",
			);
		}
	}
	log.error(
		{ retries, context, err: lastResult.error },
		"Navigation step failed after all retries",
	);
	return lastResult;
}
