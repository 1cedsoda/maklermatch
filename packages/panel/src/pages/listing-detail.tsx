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
				<Link
					to="/listings"
					className="text-muted-foreground hover:underline text-sm"
				>
					Back to listings
				</Link>
				<p className="text-destructive">{error}</p>
			</div>
		);
	}

	if (!listing) {
		return <p className="text-muted-foreground">Loading...</p>;
	}

	const latestAbstract = listing.versions[0];
	const latestDetail = listing.detailSnapshots[0];
	const description = latestDetail?.description ?? latestAbstract?.description;

	return (
		<div className="space-y-6">
			<Link
				to="/listings"
				className="text-muted-foreground hover:underline text-sm"
			>
				Back to listings
			</Link>

			<Card>
				<CardHeader>
					<CardTitle>{latestAbstract?.title ?? listing.id}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm">
					<div className="grid grid-cols-2 gap-x-8 gap-y-2">
						<p>
							<span className="text-muted-foreground">City:</span>{" "}
							{listing.city}
						</p>
						<p>
							<span className="text-muted-foreground">Price:</span>{" "}
							{latestAbstract?.price ?? "-"}
						</p>
						<p>
							<span className="text-muted-foreground">Location:</span>{" "}
							{latestAbstract?.location ?? "-"}
						</p>
						{latestDetail?.category && (
							<p>
								<span className="text-muted-foreground">Category:</span>{" "}
								{latestDetail.category}
							</p>
						)}
						<p>
							<span className="text-muted-foreground">First seen:</span>{" "}
							{new Date(listing.firstSeen).toLocaleString()}
						</p>
						<p>
							<span className="text-muted-foreground">Last seen:</span>{" "}
							{new Date(listing.lastSeen).toLocaleString()}
						</p>
						{latestDetail?.viewCount != null && (
							<p>
								<span className="text-muted-foreground">Views:</span>{" "}
								{latestDetail.viewCount}
							</p>
						)}
						{latestDetail?.imageUrls && latestDetail.imageUrls.length > 0 && (
							<p>
								<span className="text-muted-foreground">Images:</span>{" "}
								{latestDetail.imageUrls.length}
							</p>
						)}
					</div>

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

					{listing.seller && (
						<p>
							<span className="text-muted-foreground">Seller:</span>{" "}
							<Link
								to={`/sellers/${listing.seller.id}`}
								className="text-primary hover:underline"
							>
								{listing.seller.latestSnapshot?.name ??
									listing.seller.externalId}
							</Link>
							{listing.seller.latestSnapshot?.type && (
								<Badge variant="outline" className="ml-2">
									{listing.seller.latestSnapshot.type}
								</Badge>
							)}
						</p>
					)}

					{latestAbstract && latestAbstract.tags.length > 0 && (
						<div className="flex items-center gap-1.5 flex-wrap">
							<span className="text-muted-foreground">Tags:</span>
							{latestAbstract.tags.map((tag) => (
								<Badge key={tag} variant="secondary">
									{tag}
								</Badge>
							))}
						</div>
					)}

					{latestDetail?.features && latestDetail.features.length > 0 && (
						<div className="flex items-center gap-1.5 flex-wrap">
							<span className="text-muted-foreground">Features:</span>
							{latestDetail.features.map((f) => (
								<Badge key={f} variant="outline">
									{f}
								</Badge>
							))}
						</div>
					)}

					{latestDetail?.details &&
						Object.keys(latestDetail.details).length > 0 && (
							<div>
								<span className="text-muted-foreground">Details:</span>
								<div className="mt-1 grid grid-cols-2 gap-x-8 gap-y-1">
									{Object.entries(latestDetail.details).map(([key, value]) => (
										<p key={key}>
											<span className="text-muted-foreground">{key}:</span>{" "}
											{value}
										</p>
									))}
								</div>
							</div>
						)}

					{description && (
						<div>
							<span className="text-muted-foreground">Description:</span>
							<p className="mt-1 whitespace-pre-wrap">{description}</p>
						</div>
					)}
				</CardContent>
			</Card>

			<div>
				<h3 className="text-lg font-semibold mb-2">
					Abstract Snapshots ({listing.versions.length})
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

			{listing.detailSnapshots.length > 0 && (
				<div>
					<h3 className="text-lg font-semibold mb-2">
						Detail Snapshots ({listing.detailSnapshots.length})
					</h3>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>#</TableHead>
								<TableHead>Category</TableHead>
								<TableHead>Views</TableHead>
								<TableHead>Images</TableHead>
								<TableHead>Seller</TableHead>
								<TableHead>Seen At</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{listing.detailSnapshots.map((d, i) => (
								<TableRow key={d.id}>
									<TableCell>{listing.detailSnapshots.length - i}</TableCell>
									<TableCell>{d.category ?? "-"}</TableCell>
									<TableCell>{d.viewCount ?? "-"}</TableCell>
									<TableCell>{d.imageUrls?.length ?? 0}</TableCell>
									<TableCell>
										{d.sellerId && listing.seller ? (
											<Link
												to={`/sellers/${listing.seller.id}`}
												className="text-primary hover:underline"
											>
												{listing.seller.latestSnapshot?.name ??
													listing.seller.externalId}
											</Link>
										) : (
											"-"
										)}
									</TableCell>
									<TableCell>{new Date(d.seenAt).toLocaleString()}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}
