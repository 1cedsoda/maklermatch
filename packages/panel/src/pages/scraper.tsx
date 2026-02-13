import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ScraperPage() {
	const [status, setStatus] = useState<{
		quest: { id: number; city: string } | null;
		isRunning: boolean;
		lastRunAt: string | null;
	} | null>(null);
	const [error, setError] = useState("");
	const [triggering, setTriggering] = useState(false);

	const fetchStatus = useCallback(() => {
		api
			.getScraperStatus()
			.then(setStatus)
			.catch(() => setError("Scraping server unavailable"));
	}, []);

	useEffect(() => {
		fetchStatus();
		const interval = setInterval(fetchStatus, 10_000);
		return () => clearInterval(interval);
	}, [fetchStatus]);

	const handleTrigger = async () => {
		setTriggering(true);
		try {
			await api.triggerScrape();
			fetchStatus();
		} catch {
			setError("Failed to trigger scrape");
		} finally {
			setTriggering(false);
		}
	};

	return (
		<div className="space-y-4">
			<h2 className="text-2xl font-bold">Scraper</h2>

			{error && <p className="text-destructive text-sm">{error}</p>}

			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium text-muted-foreground">
						Status
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{status ? (
						<>
							<div className="flex items-center gap-2">
								<Badge variant={status.isRunning ? "default" : "secondary"}>
									{status.isRunning ? "Running" : "Idle"}
								</Badge>
								{status.quest && (
									<span className="text-sm text-muted-foreground">
										Quest: {status.quest.city}
									</span>
								)}
							</div>
							{status.lastRunAt && (
								<p className="text-sm text-muted-foreground">
									Last run: {new Date(status.lastRunAt).toLocaleString()}
								</p>
							)}
							<Button
								onClick={handleTrigger}
								disabled={triggering || status.isRunning}
							>
								{triggering ? "Triggering..." : "Trigger Scrape"}
							</Button>
						</>
					) : (
						<p className="text-sm text-muted-foreground">Loading...</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
