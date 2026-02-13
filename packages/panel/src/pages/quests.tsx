import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function QuestsPage() {
	const [quests, setQuests] = useState<SearchQuest[]>([]);
	const [showForm, setShowForm] = useState(false);
	const [error, setError] = useState("");

	const fetchQuests = () => {
		api.getQuests().then((res) => setQuests(res.quests));
	};

	useEffect(() => {
		fetchQuests();
	}, []);

	const handleToggleActive = async (quest: SearchQuest) => {
		try {
			await api.updateQuest(quest.id, { active: !quest.active });
			fetchQuests();
		} catch {
			setError(`Failed to update quest "${quest.name}"`);
		}
	};

	const handleDelete = async (quest: SearchQuest) => {
		if (!confirm(`Delete quest "${quest.name}"?`)) return;
		try {
			await api.deleteQuest(quest.id);
			fetchQuests();
		} catch {
			setError(`Failed to delete quest "${quest.name}"`);
		}
	};

	const handleStartScrape = async (quest: SearchQuest) => {
		try {
			await api.startScrape(quest.id);
		} catch {
			setError(`Failed to start scrape for quest "${quest.name}"`);
		}
	};

	const handleCreate = async (data: CreateQuestRequest) => {
		try {
			await api.createQuest(data);
			setShowForm(false);
			fetchQuests();
		} catch {
			setError("Failed to create quest");
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">Quests</h2>
				<Button onClick={() => setShowForm(!showForm)}>
					{showForm ? "Cancel" : "New Quest"}
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
						<TableHead>Location</TableHead>
						<TableHead>Category</TableHead>
						<TableHead>Active</TableHead>
						<TableHead>Interval (min)</TableHead>
						<TableHead>Max Pages</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{quests.map((q) => (
						<TableRow key={q.id}>
							<TableCell className="font-medium">{q.name}</TableCell>
							<TableCell>{q.location}</TableCell>
							<TableCell>{q.category}</TableCell>
							<TableCell>
								<Badge
									variant={q.active ? "default" : "secondary"}
									className="cursor-pointer"
									onClick={() => handleToggleActive(q)}
								>
									{q.active ? "active" : "inactive"}
								</Badge>
							</TableCell>
							<TableCell>
								{q.minIntervalMinutes}–{q.maxIntervalMinutes}
							</TableCell>
							<TableCell>{q.maxPages ?? "all"}</TableCell>
							<TableCell className="text-right space-x-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleStartScrape(q)}
								>
									Scrape
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => handleDelete(q)}
								>
									Delete
								</Button>
							</TableCell>
						</TableRow>
					))}
					{quests.length === 0 && (
						<TableRow>
							<TableCell
								colSpan={7}
								className="text-center text-muted-foreground"
							>
								No quests yet
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
				<CardTitle className="text-sm font-medium">Create Quest</CardTitle>
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
