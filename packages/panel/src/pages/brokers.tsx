import { useCallback, useEffect, useState } from "react";
import {
	api,
	type BrokerRow,
	type BrokerInput,
	type CompanyRow,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, X } from "lucide-react";

const EMPTY_FORM: BrokerInput = {
	name: "",
	companyId: undefined,
	phone: "",
	email: "",
	bio: "",
};

export function BrokersPage() {
	const [brokers, setBrokers] = useState<BrokerRow[]>([]);
	const [companies, setCompanies] = useState<CompanyRow[]>([]);
	const [editing, setEditing] = useState<number | "new" | null>(null);
	const [form, setForm] = useState<BrokerInput>(EMPTY_FORM);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const load = useCallback(() => {
		api
			.getBrokers()
			.then(setBrokers)
			.catch(() => setError("Fehler beim Laden"));
		api
			.getCompanies()
			.then(setCompanies)
			.catch(() => {});
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	function startNew() {
		setEditing("new");
		setForm({ ...EMPTY_FORM });
		setError("");
	}

	function startEdit(broker: BrokerRow) {
		setEditing(broker.id);
		setForm({
			name: broker.name,
			companyId: broker.companyId ?? undefined,
			phone: broker.phone ?? "",
			email: broker.email,
			bio: broker.bio ?? "",
		});
		setError("");
	}

	function cancel() {
		setEditing(null);
		setError("");
	}

	async function save() {
		if (!form.name || !form.email) {
			setError("Name und E-Mail sind Pflichtfelder");
			return;
		}
		setSaving(true);
		setError("");
		try {
			if (editing === "new") {
				await api.createBroker(form);
			} else if (typeof editing === "number") {
				await api.updateBroker(editing, form);
			}
			setEditing(null);
			load();
		} catch {
			setError("Fehler beim Speichern");
		} finally {
			setSaving(false);
		}
	}

	async function handleDelete(id: number) {
		try {
			await api.deleteBroker(id);
			load();
			if (editing === id) setEditing(null);
		} catch {
			setError("Fehler beim Löschen");
		}
	}

	function updateField(key: string, value: unknown) {
		setForm((prev) => ({ ...prev, [key]: value }));
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">Users</h2>
				{editing === null && (
					<Button onClick={startNew} size="sm">
						<Plus className="mr-1 h-4 w-4" />
						Neuer User
					</Button>
				)}
			</div>

			{error && <p className="text-destructive text-sm">{error}</p>}

			{editing !== null && (
				<Card>
					<CardHeader>
						<CardTitle>
							{editing === "new" ? "Neuer User" : "User bearbeiten"}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4">
							{/* Company */}
							<div className="space-y-1">
								<Label>Unternehmen</Label>
								<Select
									value={form.companyId?.toString() ?? ""}
									onChange={(e) =>
										updateField(
											"companyId",
											e.target.value ? Number(e.target.value) : null,
										)
									}
								>
									<option value="">– Kein Unternehmen –</option>
									{companies.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name}
										</option>
									))}
								</Select>
							</div>

							{/* Core fields */}
							<div className="grid grid-cols-2 gap-4">
								<Field
									label="Name *"
									value={form.name}
									onChange={(v) => updateField("name", v)}
									placeholder="Dr. Marcus Hoffmann"
								/>
								<Field
									label="E-Mail *"
									value={form.email}
									onChange={(v) => updateField("email", v)}
									placeholder="makler@firma.de"
									type="email"
								/>
							</div>
							<Field
								label="Phone"
								value={form.phone ?? ""}
								onChange={(v) => updateField("phone", v)}
								placeholder="0761 123 456"
							/>

							{/* Bio */}
							<div className="space-y-1">
								<Label>Bio</Label>
								<textarea
									className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
									rows={6}
									value={form.bio ?? ""}
									onChange={(e) => updateField("bio", e.target.value)}
									placeholder="Freitext-Beschreibung der Person: Arbeitsweise, Spezialisierung, Erfahrung, Besonderheiten..."
								/>
							</div>

							{/* Actions */}
							<div className="flex gap-2 border-t pt-4">
								<Button onClick={save} disabled={saving}>
									{saving
										? "Speichert..."
										: editing === "new"
											? "Anlegen"
											: "Speichern"}
								</Button>
								<Button variant="outline" onClick={cancel}>
									<X className="mr-1 h-4 w-4" />
									Abbrechen
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Alle Users</CardTitle>
				</CardHeader>
				<CardContent>
					{brokers.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Noch keine Users angelegt.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Unternehmen</TableHead>
									<TableHead>E-Mail</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="w-24" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{brokers.map((b) => (
									<TableRow
										key={b.id}
										className={editing === b.id ? "bg-muted/50" : ""}
									>
										<TableCell className="font-medium">{b.name}</TableCell>
										<TableCell>
											{b.companyName ?? (
												<span className="text-muted-foreground">–</span>
											)}
										</TableCell>
										<TableCell>{b.email}</TableCell>
										<TableCell>
											<Badge variant={b.active ? "default" : "secondary"}>
												{b.active ? "Aktiv" : "Inaktiv"}
											</Badge>
										</TableCell>
										<TableCell>
											<div className="flex gap-1">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => startEdit(b)}
												>
													<Pencil className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleDelete(b.id)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function Field({
	label,
	value,
	onChange,
	placeholder,
	type = "text",
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
	type?: string;
}) {
	return (
		<div className="space-y-1">
			<Label>{label}</Label>
			<Input
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
			/>
		</div>
	);
}
