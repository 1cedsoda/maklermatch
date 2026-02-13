import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { SearchTarget, ScrapingTask } from "@scraper/api-types";

export function TargetDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [target, setTarget] = useState<SearchTarget | null>(null);
	const [tasks, setTasks] = useState<ScrapingTask[]>([]);
	const [error, setError] = useState("");

	const targetId = Number(id);

	const fetchTasks = useCallback(() => {
		if (!targetId) return;
		api.getScrapingTasks({ targetId }).then((res) => setTasks(res.tasks));
	}, [targetId]);

	useEffect(() => {
		if (!targetId) return;
		api
			.getTarget(targetId)
			.then(setTarget)
			.catch(() => setError("Scraping target not found"));
		fetchTasks();
	}, [targetId, fetchTasks]);

	const handleDelete = async () => {
		if (!target || !confirm(`Delete scraping target "${target.name}"?`)) return;
		try {
			await api.deleteTarget(target.id);
			navigate("/targets");
		} catch {
			setError("Failed to delete scraping target");
		}
	};

	if (error) {
		return (
			<div className="space-y-4">
				<h2 className="text-2xl font-bold">Scraping Target</h2>
				<p className="text-destructive text-sm">{error}</p>
				<Link
					to="/targets"
					className="text-primary underline-offset-4 hover:underline text-sm"
				>
					Back to scraping targets
				</Link>
			</div>
		);
	}

	if (!target) {
		return (
			<div className="space-y-4">
				<h2 className="text-2xl font-bold">Scraping Target</h2>
				<p className="text-muted-foreground text-sm">Loading...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<Link
						to="/targets"
						className="text-muted-foreground underline-offset-4 hover:underline text-sm"
					>
						Scraping Targets
					</Link>
					<h2 className="text-2xl font-bold">{target.name}</h2>
				</div>
				<Button variant="destructive" size="sm" onClick={handleDelete}>
					Delete
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium text-muted-foreground">
						Configuration
					</CardTitle>
				</CardHeader>
				<CardContent>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
						<div>
							<dt className="text-muted-foreground">Location</dt>
							<dd className="font-medium">{target.location}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Category</dt>
							<dd className="font-medium">{target.category}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Max Pages</dt>
							<dd className="font-medium">{target.maxPages ?? "all"}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Interval (min)</dt>
							<dd className="font-medium">
								{target.minIntervalMinutes}–{target.maxIntervalMinutes}
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Private only</dt>
							<dd className="font-medium">
								{target.isPrivate === null
									? "any"
									: target.isPrivate
										? "yes"
										: "no"}
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Active</dt>
							<dd className="font-medium">{target.active ? "yes" : "no"}</dd>
						</div>
					</dl>
				</CardContent>
			</Card>

			<div className="space-y-3">
				<h3 className="text-lg font-semibold">Scraping Tasks</h3>
				{tasks.length === 0 ? (
					<p className="text-muted-foreground text-sm">No scraping tasks yet</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Started At</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Pages</TableHead>
								<TableHead>Listings</TableHead>
								<TableHead>Details</TableHead>
								<TableHead>Error</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{tasks.map((t) => (
								<TableRow key={t.id}>
									<TableCell>
										{new Date(t.startedAt).toLocaleString()}
									</TableCell>
									<TableCell>
										<StatusBadge status={t.status} />
									</TableCell>
									<TableCell>{t.pagesScraped ?? "-"}</TableCell>
									<TableCell>{t.listingsFound ?? "-"}</TableCell>
									<TableCell>
										{t.detailsScraped ?? "-"}
										{t.detailsFailed ? ` (${t.detailsFailed} failed)` : ""}
									</TableCell>
									<TableCell className="max-w-xs truncate">
										{t.errorMessage ?? "-"}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
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
				: "secondary";
	return <Badge variant={variant}>{status}</Badge>;
}
