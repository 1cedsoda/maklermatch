import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { ListingWithLatestVersion } from "@scraper/api-types";

export function ListingsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const page = Number(searchParams.get("page")) || 1;
	const [listings, setListings] = useState<ListingWithLatestVersion[]>([]);
	const [total, setTotal] = useState(0);
	const limit = 20;

	useEffect(() => {
		api.getListings(page, limit).then((res) => {
			setListings(res.listings);
			setTotal(res.total);
		});
	}, [page]);

	const totalPages = Math.ceil(total / limit);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">Listings</h2>
				<p className="text-sm text-muted-foreground">{total} total</p>
			</div>

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Title</TableHead>
						<TableHead>Price</TableHead>
						<TableHead>Location</TableHead>
						<TableHead>Last Seen</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{listings.map((listing) => (
						<TableRow key={listing.id}>
							<TableCell>
								<Link
									to={`/listings/${listing.id}`}
									className="text-primary hover:underline"
								>
									{listing.latestVersion?.title ?? listing.id}
								</Link>
							</TableCell>
							<TableCell>{listing.latestVersion?.price ?? "-"}</TableCell>
							<TableCell>{listing.latestVersion?.location ?? "-"}</TableCell>
							<TableCell>
								{new Date(listing.lastSeen).toLocaleString()}
							</TableCell>
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
