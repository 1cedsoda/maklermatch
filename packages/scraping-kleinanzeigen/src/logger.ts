import pino from "pino";
import pinoPretty from "pino-pretty";
import { Writable } from "node:stream";

let onLogLine: ((line: string, ts: number) => void) | null = null;

export function setLogLineHandler(handler: (line: string, ts: number) => void) {
	onLogLine = handler;
}

const logStream = new Writable({
	write(chunk, _encoding, callback) {
		const text = typeof chunk === "string" ? chunk : chunk.toString();
		process.stdout.write(text);

		if (onLogLine) {
			const ts = Date.now();
			for (const line of text.split("\n")) {
				if (line.length > 0) {
					onLogLine(line, ts);
				}
			}
		}
		callback();
	},
});

export const logger = pino(
	pinoPretty({
		colorize: true,
		translateTime: "HH:MM:ss.l",
		ignore: "pid,hostname",
		destination: logStream,
	}),
);
