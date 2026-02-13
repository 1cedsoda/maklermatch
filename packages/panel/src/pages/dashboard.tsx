import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ScrapingTask } from "@scraper/api-types";

export function DashboardPage() {
	const [totalListings, setTotalListings] = useState<number | null>(null);
	const [recentTasks, setRecentTasks] = useState<ScrapingTask[]>([]);
	const [scraperStatus, setScraperStatus] = useState<{
		isRunning: boolean;
		lastRunAt: string | null;
	} | null>(null);

	useEffect(() => {
		api.getListings(1, 1).then((res) => setTotalListings(res.total));
		api.getScrapingTasks().then((res) => setRecentTasks(res.tasks.slice(0, 5)));
		api
			.getScraperStatus()
			.then(setScraperStatus)
			.catch(() => {});
	}, []);

	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-bold">Dashboard</h2>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Total Listings
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-bold">{totalListings ?? "..."}</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Scraper Status
						</CardTitle>
					</CardHeader>
					<CardContent>
						{scraperStatus ? (
							<div className="space-y-1">
								<Badge
									variant={scraperStatus.isRunning ? "default" : "secondary"}
								>
									{scraperStatus.isRunning ? "Running" : "Idle"}
								</Badge>
								{scraperStatus.lastRunAt && (
									<p className="text-sm text-muted-foreground">
										Last run:{" "}
										{new Date(scraperStatus.lastRunAt).toLocaleString()}
									</p>
								)}
							</div>
						) : (
							<p className="text-sm text-muted-foreground">Unavailable</p>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Recent Scraping Runs
						</CardTitle>
					</CardHeader>
					<CardContent>
						{recentTasks.length === 0 ? (
							<p className="text-sm text-muted-foreground">No tasks yet</p>
						) : (
							<div className="space-y-2">
								{recentTasks.map((t) => (
									<div
										key={t.id}
										className="flex items-center justify-between text-sm"
									>
										<span className="text-muted-foreground">
											{t.targetName} &middot;{" "}
											{new Date(t.startedAt).toLocaleString()}
										</span>
										<StatusBadge status={t.status} />
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
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
