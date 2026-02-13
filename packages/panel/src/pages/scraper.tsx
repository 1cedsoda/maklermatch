import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { api, type ScraperStatusResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SearchQuest } from "@scraper/api-types";

export function ScraperPage() {
	const [status, setStatus] = useState<ScraperStatusResponse | null>(null);
	const [quests, setQuests] = useState<SearchQuest[]>([]);
	const [selectedQuestId, setSelectedQuestId] = useState<number | null>(null);
	const [error, setError] = useState("");
	const [starting, setStarting] = useState(false);

	const fetchStatus = useCallback(() => {
		api
			.getScraperStatus()
			.then(setStatus)
			.catch(() => setError("Scraping server unavailable"));
	}, []);

	useEffect(() => {
		api.getQuests().then((res) => {
			setQuests(res.quests);
			if (res.quests.length > 0 && selectedQuestId === null) {
				setSelectedQuestId(res.quests[0].id);
			}
		});
	}, []);

	useEffect(() => {
		fetchStatus();
		const interval = setInterval(fetchStatus, 10_000);
		return () => clearInterval(interval);
	}, [fetchStatus]);

	const handleStart = async () => {
		if (!selectedQuestId) return;
		setStarting(true);
		try {
			await api.startScrape(selectedQuestId);
			fetchStatus();
		} catch {
			setError("Failed to start scrape");
		} finally {
			setStarting(false);
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
								{status.currentTask && (
									<span className="text-sm text-muted-foreground">
										<Link
											to="/quests"
											className="text-primary underline-offset-4 hover:underline"
										>
											{status.currentTask.questName}
										</Link>{" "}
										({status.currentTask.questLocation})
									</span>
								)}
							</div>
							{status.lastRunAt && (
								<p className="text-sm text-muted-foreground">
									Last run: {new Date(status.lastRunAt).toLocaleString()}
								</p>
							)}
							<div className="flex items-center gap-2">
								<select
									className="border px-3 py-2 text-sm bg-background text-foreground"
									value={selectedQuestId ?? ""}
									onChange={(e) =>
										setSelectedQuestId(Number(e.target.value) || null)
									}
								>
									<option value="" disabled>
										Select a quest
									</option>
									{quests.map((q) => (
										<option key={q.id} value={q.id}>
											{q.name} ({q.location})
										</option>
									))}
								</select>
								<Button
									onClick={handleStart}
									disabled={starting || status.isRunning || !selectedQuestId}
								>
									{starting ? "Starting..." : "Start Scrape"}
								</Button>
							</div>
						</>
					) : (
						<p className="text-sm text-muted-foreground">Loading...</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
