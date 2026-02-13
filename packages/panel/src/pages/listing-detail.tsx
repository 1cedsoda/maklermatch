import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { ListingWithVersions } from "@scraper/api-types";

export function ListingDetailPage() {
	const { id } = useParams<{ id: string }>();
	const [listing, setListing] = useState<ListingWithVersions | null>(null);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!id) return;
		api
			.getListing(id)
			.then(setListing)
			.catch(() => setError("Listing not found"));
	}, [id]);

	if (error) {
		return (
			<div className="space-y-4">
				<Link to="/listings" className="text-primary hover:underline text-sm">
					Back to listings
				</Link>
				<p className="text-destructive">{error}</p>
			</div>
		);
	}

	if (!listing) {
		return <p className="text-muted-foreground">Loading...</p>;
	}

	const latest = listing.versions[0];

	return (
		<div className="space-y-6">
			<Link to="/listings" className="text-primary hover:underline text-sm">
				Back to listings
			</Link>

			<Card>
				<CardHeader>
					<CardTitle>{latest?.title ?? listing.id}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm">
					<p>
						<span className="text-muted-foreground">City:</span> {listing.city}
					</p>
					<p>
						<span className="text-muted-foreground">Price:</span>{" "}
						{latest?.price ?? "-"}
					</p>
					<p>
						<span className="text-muted-foreground">Location:</span>{" "}
						{latest?.location ?? "-"}
					</p>
					<p>
						<span className="text-muted-foreground">URL:</span>{" "}
						<a
							href={listing.url}
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary hover:underline"
						>
							{listing.url}
						</a>
					</p>
					<p>
						<span className="text-muted-foreground">First seen:</span>{" "}
						{new Date(listing.firstSeen).toLocaleString()}
					</p>
					<p>
						<span className="text-muted-foreground">Last seen:</span>{" "}
						{new Date(listing.lastSeen).toLocaleString()}
					</p>
					{latest?.description && (
						<div>
							<span className="text-muted-foreground">Description:</span>
							<p className="mt-1 whitespace-pre-wrap">{latest.description}</p>
						</div>
					)}
				</CardContent>
			</Card>

			<div>
				<h3 className="text-lg font-semibold mb-2">
					Version History ({listing.versions.length})
				</h3>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>#</TableHead>
							<TableHead>Title</TableHead>
							<TableHead>Price</TableHead>
							<TableHead>Location</TableHead>
							<TableHead>Seen At</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{listing.versions.map((v, i) => (
							<TableRow key={v.id}>
								<TableCell>{listing.versions.length - i}</TableCell>
								<TableCell>{v.title}</TableCell>
								<TableCell>{v.price ?? "-"}</TableCell>
								<TableCell>{v.location ?? "-"}</TableCell>
								<TableCell>{new Date(v.seenAt).toLocaleString()}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
