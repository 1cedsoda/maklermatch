import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { SellerWithLatestSnapshot } from "@scraper/api-types";
import { formatDateTime } from "@/lib/format";

export function SellersPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const page = Number(searchParams.get("page")) || 1;
	const [sellers, setSellers] = useState<SellerWithLatestSnapshot[]>([]);
	const [total, setTotal] = useState(0);
	const limit = 20;

	useEffect(() => {
		api.getSellers(page, limit).then((res) => {
			setSellers(res.sellers);
			setTotal(res.total);
		});
	}, [page]);

	const totalPages = Math.ceil(total / limit);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">Leads</h2>
				<p className="text-sm text-muted-foreground">{total} total</p>
			</div>

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Type</TableHead>
						<TableHead>Active Since</TableHead>
						<TableHead>Other Ads</TableHead>
						<TableHead>Scraped Other Ads</TableHead>
						<TableHead>Last Seen</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sellers.map((seller) => (
						<TableRow key={seller.id}>
							<TableCell>
								<Link
									to={`/sellers/${seller.id}`}
									className="text-primary hover:underline"
								>
									{seller.latestSnapshot?.name ?? seller.externalId}
								</Link>
							</TableCell>
							<TableCell>
								{seller.latestSnapshot?.type ? (
									<Badge variant="outline">{seller.latestSnapshot.type}</Badge>
								) : (
									"-"
								)}
							</TableCell>
							<TableCell>{seller.latestSnapshot?.activeSince ?? "-"}</TableCell>
							<TableCell>
								{seller.latestSnapshot?.otherAdsCount ?? "-"}
							</TableCell>
							<TableCell>{seller.scrapedAdsCount}</TableCell>
							<TableCell>{formatDateTime(seller.lastSeen)}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			<div className="flex items-center gap-2 justify-center">
				<Button
					variant="outline"
					size="sm"
					disabled={page <= 1}
					onClick={() => setSearchParams({ page: String(page - 1) })}
				>
					Previous
				</Button>
				<span className="text-sm text-muted-foreground">
					Page {page} of {totalPages}
				</span>
				<Button
					variant="outline"
					size="sm"
					disabled={page >= totalPages}
					onClick={() => setSearchParams({ page: String(page + 1) })}
				>
					Next
				</Button>
			</div>
		</div>
	);
}
