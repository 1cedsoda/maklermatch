import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { SellerWithSnapshots } from "@scraper/api-types";

export function SellerDetailPage() {
	const { id } = useParams<{ id: string }>();
	const [seller, setSeller] = useState<SellerWithSnapshots | null>(null);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!id) return;
		api
			.getSeller(Number(id))
			.then(setSeller)
			.catch(() => setError("Seller not found"));
	}, [id]);

	if (error) {
		return (
			<div className="space-y-4">
				<Link
					to="/sellers"
					className="text-muted-foreground hover:underline text-sm"
				>
					Back to sellers
				</Link>
				<p className="text-destructive">{error}</p>
			</div>
		);
	}

	if (!seller) {
		return <p className="text-muted-foreground">Loading...</p>;
	}

	const latest = seller.snapshots[0];

	return (
		<div className="space-y-6">
			<Link
				to="/sellers"
				className="text-muted-foreground hover:underline text-sm"
			>
				Back to sellers
			</Link>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						{latest?.name ?? seller.externalId}
						{latest?.type && <Badge variant="outline">{latest.type}</Badge>}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm">
					<div className="grid grid-cols-2 gap-x-8 gap-y-2">
						<p>
							<span className="text-muted-foreground">External ID:</span>{" "}
							{seller.externalId}
						</p>
						{latest?.activeSince && (
							<p>
								<span className="text-muted-foreground">Active since:</span>{" "}
								{latest.activeSince}
							</p>
						)}
						{latest?.otherAdsCount != null && (
							<p>
								<span className="text-muted-foreground">Other ads:</span>{" "}
								{latest.otherAdsCount}
							</p>
						)}
						<p>
							<span className="text-muted-foreground">First seen:</span>{" "}
							{new Date(seller.firstSeen).toLocaleString()}
						</p>
						<p>
							<span className="text-muted-foreground">Last seen:</span>{" "}
							{new Date(seller.lastSeen).toLocaleString()}
						</p>
					</div>
				</CardContent>
			</Card>

			<div>
				<h3 className="text-lg font-semibold mb-2">
					Snapshot History ({seller.snapshots.length})
				</h3>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>#</TableHead>
							<TableHead>Name</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Active Since</TableHead>
							<TableHead>Other Ads</TableHead>
							<TableHead>Seen At</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{seller.snapshots.map((s, i) => (
							<TableRow key={s.id}>
								<TableCell>{seller.snapshots.length - i}</TableCell>
								<TableCell>{s.name ?? "-"}</TableCell>
								<TableCell>
									{s.type ? <Badge variant="outline">{s.type}</Badge> : "-"}
								</TableCell>
								<TableCell>{s.activeSince ?? "-"}</TableCell>
								<TableCell>{s.otherAdsCount ?? "-"}</TableCell>
								<TableCell>{new Date(s.seenAt).toLocaleString()}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{seller.listings.length > 0 && (
				<div>
					<h3 className="text-lg font-semibold mb-2">
						Associated Listings ({seller.listings.length})
					</h3>
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
							{seller.listings.map((listing) => (
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
									<TableCell>
										{listing.latestVersion?.location ?? "-"}
									</TableCell>
									<TableCell>
										{new Date(listing.lastSeen).toLocaleString()}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}
