import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { api, type ScraperStatusResponse } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, MemoryStick, Cpu, Activity } from "lucide-react";

function MemoryBar({
	label,
	usedMb,
	totalMb,
}: {
	label: string;
	usedMb: number;
	totalMb: number;
}) {
	const pct = totalMb > 0 ? Math.min((usedMb / totalMb) * 100, 100) : 0;
	const color =
		pct > 80 ? "bg-red-500" : pct > 60 ? "bg-yellow-500" : "bg-emerald-500";
	return (
		<div className="space-y-1">
			<div className="flex justify-between text-xs text-muted-foreground">
				<span>{label}</span>
				<span>
					{usedMb} / {totalMb} MB
				</span>
			</div>
			<div className="h-2 rounded-full bg-muted overflow-hidden">
				<div
					className={`h-full rounded-full transition-all duration-500 ${color}`}
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
}

export function ScraperPage() {
	const [status, setStatus] = useState<ScraperStatusResponse | null>(null);
	const [error, setError] = useState("");

	const fetchStatus = useCallback(() => {
		api
			.getScraperStatus()
			.then(setStatus)
			.catch(() => setError("Scraping server unavailable"));
	}, []);

	useEffect(() => {
		fetchStatus();
		const interval = setInterval(fetchStatus, 3_000);
		return () => clearInterval(interval);
	}, [fetchStatus]);

	const scrapers = status?.scrapers ?? [];

	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-bold">Scraper</h2>

			{error && <p className="text-destructive text-sm">{error}</p>}

			{!status && !error && (
				<p className="text-sm text-muted-foreground">Loading...</p>
			)}

			{status && scrapers.length === 0 && (
				<Card>
					<CardContent className="py-8 text-center text-muted-foreground">
						<Bot className="mx-auto mb-2 h-8 w-8 opacity-50" />
						<p className="text-sm">No scrapers connected</p>
					</CardContent>
				</Card>
			)}

			{status && scrapers.length > 0 && (
				<div className="grid gap-4 md:grid-cols-2">
					{scrapers.map((scraper) => {
						const tasks =
							status.activeTasks ??
							(status.currentTask ? [status.currentTask] : []);
						return (
							<Card key={scraper.id}>
								<CardHeader className="pb-3">
									<div className="flex items-center justify-between">
										<CardTitle className="flex items-center gap-2 text-base">
											<Bot className="h-4 w-4" />
											{scraper.name}
										</CardTitle>
										<Badge variant={tasks.length > 0 ? "default" : "secondary"}>
											{tasks.length > 0
												? `Scraping (${tasks.length}/${status.maxConcurrency ?? "?"})`
												: "Idle"}
										</Badge>
									</div>
									<p className="text-xs text-muted-foreground">
										{scraper.source} &middot; {scraper.cities.join(", ")}
									</p>
								</CardHeader>
								<CardContent className="space-y-4">
									{/* Memory usage */}
									{status.memoryMb && (
										<div className="space-y-2">
											<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
												<MemoryStick className="h-3.5 w-3.5" />
												Memory
											</div>
											<MemoryBar
												label="Heap"
												usedMb={status.memoryMb.heapUsed}
												totalMb={status.memoryMb.heapTotal}
											/>
											<MemoryBar
												label="RSS"
												usedMb={status.memoryMb.rss}
												totalMb={Math.max(status.memoryMb.rss, 512)}
											/>
										</div>
									)}

									{/* Active tasks */}
									{tasks.map((task) => (
										<div
											key={task.id}
											className="rounded-md border bg-muted/50 p-3 space-y-1"
										>
											<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
												<Activity className="h-3.5 w-3.5" />
												Active Task
											</div>
											<div className="text-sm">
												<Link
													to={`/targets/${task.targetId}`}
													className="text-primary font-medium underline-offset-4 hover:underline"
												>
													{task.targetName}
												</Link>
												<span className="text-muted-foreground">
													{" "}
													&middot; {task.targetLocation}
												</span>
											</div>
											<Link
												to={`/scraping-tasks/${task.id}`}
												className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
											>
												<Cpu className="h-3 w-3" />
												Task #{task.id}
											</Link>
										</div>
									))}

									{/* Last run */}
									{tasks.length === 0 && status.lastRunAt && (
										<p className="text-xs text-muted-foreground">
											Last run: {new Date(status.lastRunAt).toLocaleString()}
										</p>
									)}
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
