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
import { formatDateTime } from "@/lib/format";

export function ScrapingTasksPage() {
	const [tasks, setTasks] = useState<ScrapingTask[]>([]);

	useEffect(() => {
		api.getScrapingTasks().then((res) => setTasks(res.tasks));
	}, []);

	return (
		<div className="space-y-4">
			<h2 className="text-2xl font-bold">Scraping Runs</h2>

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>ID</TableHead>
						<TableHead>Scraping Target</TableHead>
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
							<TableCell>
								<Link
									to={`/scraping-tasks/${t.id}`}
									className="text-primary underline-offset-4 hover:underline"
								>
									#{t.id}
								</Link>
							</TableCell>
							<TableCell>
								<Link
									to="/targets"
									className="text-primary underline-offset-4 hover:underline"
								>
									{t.targetName}
								</Link>
								<span className="ml-1 text-muted-foreground text-xs">
									({t.targetLocation})
								</span>
							</TableCell>
							<TableCell>{formatDateTime(t.startedAt)}</TableCell>
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
				: status === "cancelled"
					? "outline"
					: "secondary";
	return <Badge variant={variant}>{status}</Badge>;
}
