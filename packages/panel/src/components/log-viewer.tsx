import { useEffect, useRef, useMemo } from "react";
import Convert from "ansi-to-html";

interface LogEntry {
	line: string;
	ts: number;
}

interface LogViewerProps {
	lines: LogEntry[];
	className?: string;
}

function formatTs(ts: number): string {
	const d = new Date(ts);
	return d.toLocaleTimeString("de-DE", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		fractionalSecondDigits: 3,
	});
}

const ansi = new Convert({ escapeXML: true });

export function LogViewer({ lines, className }: LogViewerProps) {
	const bottomRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		// Auto-scroll only if already near bottom
		const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
		if (isNearBottom) {
			bottomRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [lines.length]);

	const htmlLines = useMemo(
		() => lines.map((entry) => ansi.toHtml(entry.line)),
		[lines],
	);

	return (
		<div
			ref={containerRef}
			className={`rounded-md bg-zinc-950 p-4 font-mono text-xs leading-relaxed overflow-y-auto ${className ?? ""}`}
			style={{ maxHeight: "600px" }}
		>
			{lines.length === 0 && (
				<span className="text-zinc-500">No log lines</span>
			)}
			{lines.map((entry, i) => (
				<div key={`${entry.ts}-${i}`} className="flex gap-3">
					<span className="text-zinc-600 shrink-0 select-none">
						{formatTs(entry.ts)}
					</span>
					<span
						className="text-zinc-300 whitespace-pre-wrap break-all"
						dangerouslySetInnerHTML={{ __html: htmlLines[i] }}
					/>
				</div>
			))}
			<div ref={bottomRef} />
		</div>
	);
}
