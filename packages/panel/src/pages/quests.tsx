import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { api, type ScraperStatusResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { SearchQuest, CreateQuestRequest } from "@scraper/api-types";

function formatNextRun(nextRunAt: number | undefined, active: boolean): string {
	if (!active) return "--";
	if (!nextRunAt) return "pending";
	const diffMs = nextRunAt - Date.now();
	if (diffMs <= 0) return "imminent";
	const mins = Math.round(diffMs / 60_000);
	if (mins < 60) return `in ${mins}min`;
	const hours = Math.floor(mins / 60);
	const remainMins = mins % 60;
	return `in ${hours}h ${remainMins}min`;
}

export function QuestsPage() {
	const [quests, setQuests] = useState<SearchQuest[]>([]);
	const [showForm, setShowForm] = useState(false);
	const [error, setError] = useState("");
	const [schedulerStatus, setSchedulerStatus] = useState<Map<number, number>>(
		new Map(),
	);
	const [scraperStatus, setScraperStatus] =
		useState<ScraperStatusResponse | null>(null);

	const fetchQuests = () => {
		api.getQuests().then((res) => setQuests(res.quests));
	};

	const fetchSchedulerStatus = useCallback(() => {
		api.getSchedulerStatus().then((res) => {
			const map = new Map(res.schedule.map((s) => [s.questId, s.nextRunAt]));
			setSchedulerStatus(map);
		});
	}, []);

	const fetchScraperStatus = useCallback(() => {
		api
			.getScraperStatus()
			.then(setScraperStatus)
			.catch(() => {});
	}, []);

	useEffect(() => {
		fetchQuests();
		fetchSchedulerStatus();
		fetchScraperStatus();
		const schedulerInterval = setInterval(fetchSchedulerStatus, 30_000);
		const scraperInterval = setInterval(fetchScraperStatus, 10_000);
		return () => {
			clearInterval(schedulerInterval);
			clearInterval(scraperInterval);
		};
	}, [fetchSchedulerStatus, fetchScraperStatus]);

	const handleToggleActive = async (quest: SearchQuest) => {
		try {
			await api.updateQuest(quest.id, { active: !quest.active });
			fetchQuests();
			fetchSchedulerStatus();
		} catch {
			setError(`Failed to update scraping quest "${quest.name}"`);
		}
	};

	const handleStartScrape = async (quest: SearchQuest) => {
		try {
			await api.startScrape(quest.id);
			fetchScraperStatus();
			fetchSchedulerStatus();
		} catch {
			setError(`Failed to start scrape for scraping quest "${quest.name}"`);
		}
	};

	const handleCreate = async (data: CreateQuestRequest) => {
		try {
			await api.createQuest(data);
			setShowForm(false);
			fetchQuests();
		} catch {
			setError("Failed to create scraping quest");
		}
	};

	const runningQuestId = scraperStatus?.currentTask?.questId ?? null;
	const runningTaskId = scraperStatus?.currentTask?.id ?? null;

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">Scraping Quests</h2>
				<Button onClick={() => setShowForm(!showForm)}>
					{showForm ? "Cancel" : "New Scraping Quest"}
				</Button>
			</div>

			{error && (
				<p className="text-destructive text-sm">
					{error}{" "}
					<button className="underline" onClick={() => setError("")}>
						dismiss
					</button>
				</p>
			)}

			{showForm && (
				<CreateQuestForm
					onSubmit={handleCreate}
					onCancel={() => setShowForm(false)}
				/>
			)}

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Scheduled</TableHead>
						<TableHead>Next Run</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{quests.map((q) => {
						const isRunning = runningQuestId === q.id;
						return (
							<TableRow key={q.id}>
								<TableCell className="font-medium">
									<Link
										to={`/quests/${q.id}`}
										className="text-primary underline-offset-4 hover:underline"
									>
										{q.name}
									</Link>
								</TableCell>
								<TableCell>
									<Switch
										checked={q.active}
										onCheckedChange={() => handleToggleActive(q)}
									/>
								</TableCell>
								<TableCell className="text-muted-foreground text-sm">
									{formatNextRun(schedulerStatus.get(q.id), q.active)}
								</TableCell>
								<TableCell>
									{isRunning ? (
										<Link to={`/scraping-tasks`} className="inline-flex">
											<Badge variant="default">running</Badge>
										</Link>
									) : (
										<span className="text-muted-foreground text-sm">idle</span>
									)}
								</TableCell>
								<TableCell className="text-right">
									<Button
										variant="outline"
										size="sm"
										disabled={isRunning}
										onClick={() => handleStartScrape(q)}
									>
										Scrape
									</Button>
								</TableCell>
							</TableRow>
						);
					})}
					{quests.length === 0 && (
						<TableRow>
							<TableCell
								colSpan={5}
								className="text-center text-muted-foreground"
							>
								No scraping quests yet
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}

function CreateQuestForm({
	onSubmit,
	onCancel,
}: {
	onSubmit: (data: CreateQuestRequest) => void;
	onCancel: () => void;
}) {
	const [name, setName] = useState("");
	const [location, setLocation] = useState("");
	const [category, setCategory] = useState("haus-zum-kauf");
	const [maxPages, setMaxPages] = useState("");
	const [minInterval, setMinInterval] = useState("30");
	const [maxInterval, setMaxInterval] = useState("60");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit({
			name,
			location,
			category,
			...(maxPages ? { maxPages: Number(maxPages) } : {}),
			minIntervalMinutes: Number(minInterval),
			maxIntervalMinutes: Number(maxInterval),
		});
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-medium">
					Create Scraping Quest
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1">
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="location">Location</Label>
						<Input
							id="location"
							value={location}
							onChange={(e) => setLocation(e.target.value)}
							required
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="category">Category</Label>
						<Input
							id="category"
							value={category}
							onChange={(e) => setCategory(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="maxPages">Max Pages (optional)</Label>
						<Input
							id="maxPages"
							type="number"
							min="1"
							value={maxPages}
							onChange={(e) => setMaxPages(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="minInterval">Min Interval (min)</Label>
						<Input
							id="minInterval"
							type="number"
							min="5"
							value={minInterval}
							onChange={(e) => setMinInterval(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="maxInterval">Max Interval (min)</Label>
						<Input
							id="maxInterval"
							type="number"
							min="5"
							value={maxInterval}
							onChange={(e) => setMaxInterval(e.target.value)}
						/>
					</div>
					<div className="sm:col-span-2 flex gap-2">
						<Button type="submit">Create</Button>
						<Button type="button" variant="outline" onClick={onCancel}>
							Cancel
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
