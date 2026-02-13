interface LogEntry {
	line: string;
	ts: number;
}

const MAX_LINES = 1000;

class RingBuffer {
	private buf: LogEntry[];
	private head = 0;
	private size = 0;

	constructor(private capacity: number) {
		this.buf = new Array(capacity);
	}

	push(entry: LogEntry): void {
		this.buf[this.head] = entry;
		this.head = (this.head + 1) % this.capacity;
		if (this.size < this.capacity) this.size++;
	}

	getAll(): LogEntry[] {
		if (this.size === 0) return [];
		if (this.size < this.capacity) return this.buf.slice(0, this.size);
		return [...this.buf.slice(this.head), ...this.buf.slice(0, this.head)];
	}
}

const buffers = new Map<string, RingBuffer>();

export function pushLogLine(scraperId: string, line: string, ts: number): void {
	let buf = buffers.get(scraperId);
	if (!buf) {
		buf = new RingBuffer(MAX_LINES);
		buffers.set(scraperId, buf);
	}
	buf.push({ line, ts });
}

export function getLogLines(scraperId: string): LogEntry[] {
	return buffers.get(scraperId)?.getAll() ?? [];
}

export function getAllLogLines(): { scraperId: string; lines: LogEntry[] }[] {
	return Array.from(buffers.entries()).map(([scraperId, buf]) => ({
		scraperId,
		lines: buf.getAll(),
	}));
}

export function deleteLogBuffer(scraperId: string): void {
	buffers.delete(scraperId);
}
