import { useEffect, useState } from "react";
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
import type { Trigger } from "@scraper/api-types";

export function TriggersPage() {
	const [triggers, setTriggers] = useState<Trigger[]>([]);

	useEffect(() => {
		api.getTriggers().then((res) => setTriggers(res.triggers));
	}, []);

	return (
		<div className="space-y-4">
			<h2 className="text-2xl font-bold">Triggers</h2>

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>ID</TableHead>
						<TableHead>City</TableHead>
						<TableHead>Triggered At</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Pages</TableHead>
						<TableHead>Listings</TableHead>
						<TableHead>Error</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{triggers.map((t) => (
						<TableRow key={t.id}>
							<TableCell>{t.id}</TableCell>
							<TableCell>{t.city}</TableCell>
							<TableCell>{new Date(t.triggeredAt).toLocaleString()}</TableCell>
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
