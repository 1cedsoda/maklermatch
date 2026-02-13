import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { ScrapingTask } from "@scraper/api-types";

export function ScrapingTasksPage() {
	const [tasks, setTasks] = useState<ScrapingTask[]>([]);

	useEffect(() => {
		api.getScrapingTasks().then((res) => setTasks(res.tasks));
	}, []);

	return (
		<div className="space-y-4">
			<h2 className="text-2xl font-bold">Scraping Tasks</h2>

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>ID</TableHead>
						<TableHead>Quest</TableHead>
						<TableHead>Started At</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Pages</TableHead>
						<TableHead>Listings</TableHead>
						<TableHead>Error</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{tasks.map((t) => (
						<TableRow key={t.id}>
							<TableCell>{t.id}</TableCell>
							<TableCell>
								<Link
									to="/quests"
									className="text-primary underline-offset-4 hover:underline"
								>
									{t.questName}
								</Link>
								<span className="ml-1 text-muted-foreground text-xs">
									({t.questLocation})
								</span>
							</TableCell>
							<TableCell>{new Date(t.startedAt).toLocaleString()}</TableCell>
							<TableCell>
								<StatusBadge status={t.status} />
							</TableCell>
							<TableCell>{t.pagesScraped ?? "-"}</TableCell>
							<TableCell>{t.listingsFound ?? "-"}</TableCell>
							<TableCell className="max-w-xs truncate">
								{t.errorMessage ?? "-"}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
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
