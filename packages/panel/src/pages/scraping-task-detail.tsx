import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router";
import { api } from "@/lib/api";
import type { ScrapingTaskDetailResponse, LogEntry } from "@scraper/api-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogViewer } from "@/components/log-viewer";
import { Cpu, ArrowLeft, XCircle } from "lucide-react";

export function ScrapingTaskDetailPage() {
	const { id } = useParams<{ id: string }>();
	const [detail, setDetail] = useState<ScrapingTaskDetailResponse | null>(null);
	const [liveLines, setLiveLines] = useState<LogEntry[]>([]);
	const [error, setError] = useState("");
	const [cancelling, setCancelling] = useState(false);
	const logPollRef = useRef<ReturnType<typeof setInterval>>(null);
	const taskPollRef = useRef<ReturnType<typeof setInterval>>(null);

	// Fetch task detail
	useEffect(() => {
		if (!id) return;
		api
			.getScrapingTask(Number(id))
			.then(setDetail)
			.catch(() => setError("Task not found"));
	}, [id]);

	// Poll live logs when task is running
	useEffect(() => {
		if (!detail?.scraperId) return;

		const scraperId = detail.scraperId;
		const poll = () => {
			api
				.getScraperLogs(scraperId)
				.then((res) => setLiveLines(res.lines))
				.catch(() => {});
		};

		poll();
		logPollRef.current = setInterval(poll, 2_000);
		return () => {
			if (logPollRef.current) clearInterval(logPollRef.current);
		};
	}, [detail?.scraperId]);

	// Re-fetch task detail while pending to detect completion
	useEffect(() => {
		if (!id || !detail || detail.task.status !== "pending") return;

		taskPollRef.current = setInterval(() => {
			api.getScrapingTask(Number(id)).then((updated) => {
				setDetail(updated);
				if (updated.task.status !== "pending" && taskPollRef.current) {
					clearInterval(taskPollRef.current);
				}
			});
		}, 3_000);

		return () => {
			if (taskPollRef.current) clearInterval(taskPollRef.current);
		};
	}, [id, detail?.task.status]);

	if (error) {
		return (
			<div className="space-y-4">
				<Link
					to="/scraping-tasks"
					className="text-muted-foreground hover:underline text-sm"
				>
					Back to tasks
				</Link>
				<p className="text-destructive">{error}</p>
			</div>
		);
	}

	if (!detail) {
		return <p className="text-sm text-muted-foreground">Loading...</p>;
	}

	const { task, scraperId } = detail;
	const isRunning = task.status === "pending" && scraperId !== null;
	const isError = task.status === "error";

	const handleCancel = async () => {
		setCancelling(true);
		try {
			await api.cancelTask(task.id);
		} catch {
			// Task may have already finished
		} finally {
			setCancelling(false);
		}
	};

	const logLines = isRunning
		? liveLines
		: isError
			? (task.errorLogs ?? [])
			: [];

	return (
		<div className="space-y-6">
			<Link
				to="/scraping-tasks"
				className="flex items-center gap-1 text-muted-foreground hover:underline text-sm"
			>
				<ArrowLeft className="h-3 w-3" />
				Back to tasks
			</Link>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							<Cpu className="h-5 w-5" />
							Scraping Task #{task.id}
						</CardTitle>
						<div className="flex items-center gap-2">
							{isRunning && (
								<Button
									variant="outline"
									size="sm"
									disabled={cancelling}
									onClick={handleCancel}
								>
									<XCircle className="h-3.5 w-3.5 mr-1.5" />
									{cancelling ? "Cancelling..." : "Cancel"}
								</Button>
							)}
							<StatusBadge status={task.status} />
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-2 text-sm">
					<div className="grid grid-cols-2 gap-x-8 gap-y-2">
						<p>
							<span className="text-muted-foreground">Target:</span>{" "}
							<Link
								to={`/targets/${task.targetId}`}
								className="text-primary hover:underline"
							>
								{task.targetName}
							</Link>
							<span className="text-muted-foreground">
								{" "}
								({task.targetLocation})
							</span>
						</p>
						<p>
							<span className="text-muted-foreground">Started:</span>{" "}
							{new Date(task.startedAt).toLocaleString()}
						</p>
						<p>
							<span className="text-muted-foreground">Pages:</span>{" "}
							{task.pagesScraped ?? "-"}
							{task.maxPages ? ` / ${task.maxPages}` : ""}
						</p>
						<p>
							<span className="text-muted-foreground">Listings found:</span>{" "}
							{task.listingsFound ?? "-"}
						</p>
						<p>
							<span className="text-muted-foreground">Details scraped:</span>{" "}
							{task.detailsScraped ?? "-"}
						</p>
						<p>
							<span className="text-muted-foreground">Details failed:</span>{" "}
							{task.detailsFailed ?? "-"}
						</p>
					</div>

					{task.errorMessage && (
						<div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 mt-2">
							<p className="text-destructive text-sm font-medium">Error</p>
							<p className="text-destructive/80 text-sm mt-1">
								{task.errorMessage}
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-semibold">
						{isRunning ? "Live Logs" : isError ? "Error Logs" : "Logs"}
					</h3>
					{isRunning && (
						<Badge variant="default" className="animate-pulse">
							Live
						</Badge>
					)}
				</div>

				{logLines.length > 0 ? (
					<LogViewer lines={logLines} />
				) : (
					<div className="rounded-md bg-muted p-8 text-center text-muted-foreground text-sm">
						{isRunning
							? "Waiting for log output..."
							: task.status === "success"
								? "Logs are not persisted for successful tasks"
								: "No log lines available"}
					</div>
				)}
			</div>
		</div>
	);
}

function StatusBadge({ status }: { status: string }) {
	const variant =
		status === "success"
			? "default"
			: status === "error"
				? "destructive"
				: status === "cancelled"
					? "outline"
					: "secondary";
	return <Badge variant={variant}>{status}</Badge>;
}
