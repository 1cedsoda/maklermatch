import type { Result } from "./result";

export async function retry<T>(
	fn: () => Promise<Result<T>>,
	maxRetries: number,
	onFailure?: (error: Error, attempt: number) => void | Promise<void>,
): Promise<Result<T>> {
	let lastError: Error = new Error("No attempts made");

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		const result = await fn();
		if (result.ok) return result;

		lastError = result.error;
		await onFailure?.(result.error, attempt);
	}

	return { ok: false, error: lastError };
}
