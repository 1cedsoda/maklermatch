import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	CATEGORY_TREE,
	SORT_OPTIONS,
	type SearchTarget,
	type ScrapingTask,
	type UpdateTargetRequest,
} from "@scraper/api-types";

interface EditForm {
	name: string;
	location: string;
	category: string;
	sorting: string;
	maxPages: string;
	minInterval: string;
	maxInterval: string;
	isPrivate: "any" | "yes" | "no";
	active: boolean;
}

function targetToForm(t: SearchTarget): EditForm {
	return {
		name: t.name,
		location: t.location,
		category: t.category,
		sorting: t.sorting ?? "",
		maxPages: t.maxPages != null ? String(t.maxPages) : "",
		minInterval: String(t.minIntervalMinutes),
		maxInterval: String(t.maxIntervalMinutes),
		isPrivate: t.isPrivate === null ? "any" : t.isPrivate ? "yes" : "no",
		active: t.active,
	};
}

function formToUpdate(form: EditForm): UpdateTargetRequest {
	return {
		name: form.name,
		location: form.location,
		category: form.category,
		sorting: (form.sorting || undefined) as UpdateTargetRequest["sorting"],
		maxPages: form.maxPages ? Number(form.maxPages) : null,
		minIntervalMinutes: Number(form.minInterval),
		maxIntervalMinutes: Number(form.maxInterval),
		isPrivate: form.isPrivate === "any" ? undefined : form.isPrivate === "yes",
		active: form.active,
	};
}

export function TargetDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [target, setTarget] = useState<SearchTarget | null>(null);
	const [tasks, setTasks] = useState<ScrapingTask[]>([]);
	const [error, setError] = useState("");
	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState<EditForm | null>(null);
	const [saving, setSaving] = useState(false);

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

	const startEdit = () => {
		if (!target) return;
		setForm(targetToForm(target));
		setEditing(true);
	};

	const cancelEdit = () => {
		setEditing(false);
		setForm(null);
	};

	const handleSave = async () => {
		if (!target || !form) return;
		setSaving(true);
		try {
			const updated = await api.updateTarget(target.id, formToUpdate(form));
			setTarget(updated);
			setEditing(false);
			setForm(null);
		} catch {
			setError("Failed to update scraping target");
		} finally {
			setSaving(false);
		}
	};

	if (error) {
		return (
			<div className="space-y-4">
				<h2 className="text-2xl font-bold">Scraping Target</h2>
				<p className="text-destructive text-sm">
					{error}{" "}
					<button className="underline" onClick={() => setError("")}>
						dismiss
					</button>
				</p>
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
				<div className="flex gap-2">
					{!editing && (
						<Button variant="outline" size="sm" onClick={startEdit}>
							Edit
						</Button>
					)}
					<Button variant="destructive" size="sm" onClick={handleDelete}>
						Delete
					</Button>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium text-muted-foreground">
						Configuration
					</CardTitle>
				</CardHeader>
				<CardContent>
					{editing && form ? (
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-1">
								<Label htmlFor="edit-name">Name</Label>
								<Input
									id="edit-name"
									value={form.name}
									onChange={(e) => setForm({ ...form, name: e.target.value })}
									required
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="edit-location">Location</Label>
								<Input
									id="edit-location"
									value={form.location}
									onChange={(e) =>
										setForm({ ...form, location: e.target.value })
									}
									required
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="edit-category">Category</Label>
								<Select
									id="edit-category"
									value={form.category}
									onChange={(e) =>
										setForm({ ...form, category: e.target.value })
									}
								>
									{CATEGORY_TREE.map((group) => (
										<optgroup key={group.id} label={group.name}>
											<option value={String(group.id)}>
												{group.name} (alle)
											</option>
											{group.children.map((child) => (
												<option key={child.id} value={String(child.id)}>
													{child.name}
												</option>
											))}
										</optgroup>
									))}
								</Select>
							</div>
							<div className="space-y-1">
								<Label htmlFor="edit-maxPages">Max Pages (optional)</Label>
								<Input
									id="edit-maxPages"
									type="number"
									min="1"
									value={form.maxPages}
									onChange={(e) =>
										setForm({ ...form, maxPages: e.target.value })
									}
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="edit-minInterval">Min Interval (min)</Label>
								<Input
									id="edit-minInterval"
									type="number"
									min="5"
									value={form.minInterval}
									onChange={(e) =>
										setForm({ ...form, minInterval: e.target.value })
									}
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="edit-maxInterval">Max Interval (min)</Label>
								<Input
									id="edit-maxInterval"
									type="number"
									min="5"
									value={form.maxInterval}
									onChange={(e) =>
										setForm({ ...form, maxInterval: e.target.value })
									}
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="edit-sorting">Sorting</Label>
								<Select
									id="edit-sorting"
									value={form.sorting}
									onChange={(e) =>
										setForm({ ...form, sorting: e.target.value })
									}
								>
									<option value="">Default</option>
									{SORT_OPTIONS.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</Select>
							</div>
							<div className="space-y-1">
								<Label htmlFor="edit-isPrivate">Private only</Label>
								<Select
									id="edit-isPrivate"
									value={form.isPrivate}
									onChange={(e) =>
										setForm({
											...form,
											isPrivate: e.target.value as "any" | "yes" | "no",
										})
									}
								>
									<option value="any">any</option>
									<option value="yes">yes</option>
									<option value="no">no</option>
								</Select>
							</div>
							<div className="flex items-center gap-2 self-end pb-1">
								<Switch
									id="edit-active"
									checked={form.active}
									onCheckedChange={(checked) =>
										setForm({ ...form, active: checked })
									}
								/>
								<Label htmlFor="edit-active">Active</Label>
							</div>
							<div className="sm:col-span-2 flex gap-2">
								<Button onClick={handleSave} disabled={saving}>
									{saving ? "Saving..." : "Save"}
								</Button>
								<Button
									variant="outline"
									onClick={cancelEdit}
									disabled={saving}
								>
									Cancel
								</Button>
							</div>
						</div>
					) : (
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
								<dt className="text-muted-foreground">Sorting</dt>
								<dd className="font-medium">
									{SORT_OPTIONS.find((o) => o.value === target.sorting)
										?.label ?? "Default"}
								</dd>
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
					)}
				</CardContent>
			</Card>

			<div className="space-y-3">
				<h3 className="text-lg font-semibold">Scraping Runs</h3>
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
				: status === "cancelled"
					? "outline"
					: "secondary";
	return <Badge variant={variant}>{status}</Badge>;
}
