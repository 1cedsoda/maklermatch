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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { CATEGORY_TREE } from "@scraper/api-types";
import type { SearchTarget, CreateTargetRequest } from "@scraper/api-types";
import { Select } from "@/components/ui/select";

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

export function TargetsPage() {
	const [targets, setTargets] = useState<SearchTarget[]>([]);
	const [showForm, setShowForm] = useState(false);
	const [error, setError] = useState("");
	const [schedulerStatus, setSchedulerStatus] = useState<Map<number, number>>(
		new Map(),
	);
	const [scraperStatus, setScraperStatus] =
		useState<ScraperStatusResponse | null>(null);
	const [scrapeDialogTarget, setScrapeDialogTarget] =
		useState<SearchTarget | null>(null);

	const fetchTargets = () => {
		api.getTargets().then((res) => setTargets(res.targets));
	};

	const fetchSchedulerStatus = useCallback(() => {
		api.getSchedulerStatus().then((res) => {
			const map = new Map(res.schedule.map((s) => [s.targetId, s.nextRunAt]));
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
		fetchTargets();
		fetchSchedulerStatus();
		fetchScraperStatus();
		const schedulerInterval = setInterval(fetchSchedulerStatus, 30_000);
		const scraperInterval = setInterval(fetchScraperStatus, 10_000);
		return () => {
			clearInterval(schedulerInterval);
			clearInterval(scraperInterval);
		};
	}, [fetchSchedulerStatus, fetchScraperStatus]);

	const handleToggleActive = async (target: SearchTarget) => {
		try {
			await api.updateTarget(target.id, { active: !target.active });
			fetchTargets();
			fetchSchedulerStatus();
		} catch {
			setError(`Failed to update scraping target "${target.name}"`);
		}
	};

	const handleStartScrape = async (target: SearchTarget, headless: boolean) => {
		try {
			await api.startScrape(target.id, { headless });
			fetchScraperStatus();
			fetchSchedulerStatus();
		} catch {
			setError(`Failed to start scrape for scraping target "${target.name}"`);
		}
	};

	const handleCreate = async (data: CreateTargetRequest) => {
		try {
			await api.createTarget(data);
			setShowForm(false);
			fetchTargets();
		} catch {
			setError("Failed to create scraping target");
		}
	};

	const runningTargetId = scraperStatus?.currentTask?.targetId ?? null;
	const runningTaskId = scraperStatus?.currentTask?.id ?? null;

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">Scraping Targets</h2>
				<Button onClick={() => setShowForm(!showForm)}>
					{showForm ? "Cancel" : "New Scraping Target"}
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
				<CreateTargetForm
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
					{targets.map((t) => {
						const isRunning = runningTargetId === t.id;
						return (
							<TableRow key={t.id}>
								<TableCell className="font-medium">
									<Link
										to={`/targets/${t.id}`}
										className="text-primary underline-offset-4 hover:underline"
									>
										{t.name}
									</Link>
								</TableCell>
								<TableCell>
									<Switch
										checked={t.active}
										onCheckedChange={() => handleToggleActive(t)}
									/>
								</TableCell>
								<TableCell className="text-muted-foreground text-sm">
									{formatNextRun(schedulerStatus.get(t.id), t.active)}
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
										onClick={() => setScrapeDialogTarget(t)}
									>
										Scrape
									</Button>
								</TableCell>
							</TableRow>
						);
					})}
					{targets.length === 0 && (
						<TableRow>
							<TableCell
								colSpan={5}
								className="text-center text-muted-foreground"
							>
								No scraping targets yet
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>

			<Dialog
				open={scrapeDialogTarget !== null}
				onOpenChange={(open) => {
					if (!open) setScrapeDialogTarget(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Start Scrape</DialogTitle>
						<DialogDescription>
							Run "{scrapeDialogTarget?.name}" in headless or visible browser
							mode?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								if (scrapeDialogTarget) {
									handleStartScrape(scrapeDialogTarget, false);
								}
								setScrapeDialogTarget(null);
							}}
						>
							Visible
						</Button>
						<Button
							onClick={() => {
								if (scrapeDialogTarget) {
									handleStartScrape(scrapeDialogTarget, true);
								}
								setScrapeDialogTarget(null);
							}}
						>
							Headless
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function CreateTargetForm({
	onSubmit,
	onCancel,
}: {
	onSubmit: (data: CreateTargetRequest) => void;
	onCancel: () => void;
}) {
	const [name, setName] = useState("");
	const [location, setLocation] = useState("");
	const [category, setCategory] = useState("208");
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
					Create Scraping Target
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
						<Select
							id="category"
							value={category}
							onChange={(e) => setCategory(e.target.value)}
						>
							{CATEGORY_TREE.map((group) => (
								<optgroup key={group.id} label={group.name}>
									<option value={String(group.id)}>{group.name} (alle)</option>
									{group.children.map((child) => (
										<option key={child.id} value={String(child.id)}>
											{child.name}
										</option>
									))}
								</optgroup>
							))}
						</Select>
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
