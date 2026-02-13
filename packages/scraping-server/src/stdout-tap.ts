import type { Socket } from "socket.io-client";
import { SocketEvents } from "@scraper/api-types";

export function tapStdout(socket: Socket): void {
	const originalWrite = process.stdout.write.bind(process.stdout);
	let buffer = "";

	process.stdout.write = function (
		chunk: string | Uint8Array,
		encodingOrCb?: BufferEncoding | ((err?: Error) => void),
		cb?: (err?: Error) => void,
	): boolean {
		const result = originalWrite(chunk, encodingOrCb as BufferEncoding, cb);

		const text = typeof chunk === "string" ? chunk : chunk.toString();
		buffer += text;

		const lines = buffer.split("\n");
		buffer = lines.pop() ?? "";

		const ts = Date.now();
		for (const line of lines) {
			if (line.length > 0) {
				socket.volatile.emit(SocketEvents.LOG_LINE, { line, ts });
			}
		}

		return result;
	} as typeof process.stdout.write;
}
