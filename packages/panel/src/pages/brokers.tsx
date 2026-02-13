import { useCallback, useEffect, useState } from "react";
import {
	api,
	type BrokerRow,
	type BrokerInput,
	type BrokerCriteria,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, X } from "lucide-react";

const EMPTY_FORM: BrokerInput & { criteriaJson: BrokerCriteria } = {
	name: "",
	firma: "",
	region: "",
	spezialisierung: "",
	erfahrungJahre: undefined,
	provision: "",
	arbeitsweise: "",
	leistungen: [],
	besonderheiten: [],
	telefon: "",
	email: "",
	criteriaJson: {},
};

export function BrokersPage() {
	const [brokers, setBrokers] = useState<BrokerRow[]>([]);
	const [editing, setEditing] = useState<number | "new" | null>(null);
	const [form, setForm] = useState<
		BrokerInput & { criteriaJson: BrokerCriteria }
	>(EMPTY_FORM);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const load = useCallback(() => {
		api
			.getBrokers()
			.then(setBrokers)
			.catch(() => setError("Fehler beim Laden"));
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	function startNew() {
		setEditing("new");
		setForm({ ...EMPTY_FORM, criteriaJson: {} });
		setError("");
	}

	function startEdit(broker: BrokerRow) {
		setEditing(broker.id);
		setForm({
			name: broker.name,
			firma: broker.firma,
			region: broker.region,
			spezialisierung: broker.spezialisierung ?? "",
			erfahrungJahre: broker.erfahrungJahre ?? undefined,
			provision: broker.provision ?? "",
			arbeitsweise: broker.arbeitsweise ?? "",
			leistungen: broker.leistungen ?? [],
			besonderheiten: broker.besonderheiten ?? [],
			telefon: broker.telefon ?? "",
			email: broker.email,
			criteriaJson: broker.criteriaJson ?? {},
		});
		setError("");
	}

	function cancel() {
		setEditing(null);
		setError("");
	}

	async function save() {
		if (!form.name || !form.firma || !form.region || !form.email) {
			setError("Name, Firma, Region und E-Mail sind Pflichtfelder");
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

	function updateCriteria(key: string, value: unknown) {
		setForm((prev) => ({
			...prev,
			criteriaJson: { ...prev.criteriaJson, [key]: value },
		}));
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">Makler</h2>
				{editing === null && (
					<Button onClick={startNew} size="sm">
						<Plus className="mr-1 h-4 w-4" />
						Neuer Makler
					</Button>
				)}
			</div>

			{error && <p className="text-destructive text-sm">{error}</p>}

			{editing !== null && (
				<BrokerForm
					form={form}
					updateField={updateField}
					updateCriteria={updateCriteria}
					onSave={save}
					onCancel={cancel}
					saving={saving}
					isNew={editing === "new"}
				/>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Alle Makler</CardTitle>
				</CardHeader>
				<CardContent>
					{brokers.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Noch keine Makler angelegt.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Firma</TableHead>
									<TableHead>Region</TableHead>
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
										<TableCell>{b.firma}</TableCell>
										<TableCell>{b.region}</TableCell>
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

function BrokerForm({
	form,
	updateField,
	updateCriteria,
	onSave,
	onCancel,
	saving,
	isNew,
}: {
	form: BrokerInput & { criteriaJson: BrokerCriteria };
	updateField: (key: string, value: unknown) => void;
	updateCriteria: (key: string, value: unknown) => void;
	onSave: () => void;
	onCancel: () => void;
	saving: boolean;
	isNew: boolean;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{isNew ? "Neuer Makler" : "Makler bearbeiten"}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid gap-4">
					{/* Core fields */}
					<div className="grid grid-cols-2 gap-4">
						<Field
							label="Name *"
							value={form.name}
							onChange={(v) => updateField("name", v)}
							placeholder="Dr. Marcus Hoffmann"
						/>
						<Field
							label="Firma *"
							value={form.firma}
							onChange={(v) => updateField("firma", v)}
							placeholder="Engel & Völkers"
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<Field
							label="Region *"
							value={form.region}
							onChange={(v) => updateField("region", v)}
							placeholder="Freiburg und Umgebung"
						/>
						<Field
							label="E-Mail *"
							value={form.email}
							onChange={(v) => updateField("email", v)}
							placeholder="makler@firma.de"
							type="email"
						/>
					</div>
					<div className="grid grid-cols-3 gap-4">
						<Field
							label="Spezialisierung"
							value={form.spezialisierung ?? ""}
							onChange={(v) => updateField("spezialisierung", v)}
							placeholder="Wohnimmobilien"
						/>
						<Field
							label="Erfahrung (Jahre)"
							value={form.erfahrungJahre?.toString() ?? ""}
							onChange={(v) =>
								updateField("erfahrungJahre", v ? Number(v) : undefined)
							}
							type="number"
						/>
						<Field
							label="Provision"
							value={form.provision ?? ""}
							onChange={(v) => updateField("provision", v)}
							placeholder="3,57% inkl. MwSt."
						/>
					</div>
					<Field
						label="Telefon"
						value={form.telefon ?? ""}
						onChange={(v) => updateField("telefon", v)}
						placeholder="0761 123 456"
					/>

					{/* Text areas */}
					<div className="space-y-1">
						<Label>Arbeitsweise</Label>
						<textarea
							className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full border px-3 py-2 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
							rows={3}
							value={form.arbeitsweise ?? ""}
							onChange={(e) => updateField("arbeitsweise", e.target.value)}
							placeholder="Beschreibung der Arbeitsweise..."
						/>
					</div>

					{/* Comma-separated lists */}
					<div className="grid grid-cols-2 gap-4">
						<ListField
							label="Leistungen"
							value={form.leistungen ?? []}
							onChange={(v) => updateField("leistungen", v)}
							placeholder="Kostenlose Erstbewertung, Exposé-Erstellung, ..."
						/>
						<ListField
							label="Besonderheiten"
							value={form.besonderheiten ?? []}
							onChange={(v) => updateField("besonderheiten", v)}
							placeholder="IHK-zertifiziert, 200+ Verkäufe, ..."
						/>
					</div>

					{/* Criteria */}
					<div className="border-t pt-4">
						<p className="mb-3 text-sm font-medium">Suchkriterien</p>
						<div className="grid grid-cols-2 gap-4">
							<ListField
								label="PLZ-Prefixe"
								value={form.criteriaJson.plzPrefixes ?? []}
								onChange={(v) => updateCriteria("plzPrefixes", v)}
								placeholder="79, 78, 80"
							/>
							<ListField
								label="Städte"
								value={form.criteriaJson.cities ?? []}
								onChange={(v) => updateCriteria("cities", v)}
								placeholder="Freiburg, München"
							/>
							<ListField
								label="Bundesländer"
								value={form.criteriaJson.bundeslaender ?? []}
								onChange={(v) => updateCriteria("bundeslaender", v)}
								placeholder="Baden-Württemberg, Bayern"
							/>
							<ListField
								label="Immobilientypen"
								value={form.criteriaJson.propertyTypes ?? []}
								onChange={(v) => updateCriteria("propertyTypes", v)}
								placeholder="Haus, Wohnung, Grundstück"
							/>
						</div>
						<div className="mt-4 grid grid-cols-2 gap-4">
							<Field
								label="Min. Preis"
								value={form.criteriaJson.minPrice?.toString() ?? ""}
								onChange={(v) =>
									updateCriteria("minPrice", v ? Number(v) : undefined)
								}
								type="number"
								placeholder="100000"
							/>
							<Field
								label="Max. Preis"
								value={form.criteriaJson.maxPrice?.toString() ?? ""}
								onChange={(v) =>
									updateCriteria("maxPrice", v ? Number(v) : undefined)
								}
								type="number"
								placeholder="3000000"
							/>
						</div>
					</div>

					{/* Actions */}
					<div className="flex gap-2 border-t pt-4">
						<Button onClick={onSave} disabled={saving}>
							{saving ? "Speichert..." : isNew ? "Anlegen" : "Speichern"}
						</Button>
						<Button variant="outline" onClick={onCancel}>
							<X className="mr-1 h-4 w-4" />
							Abbrechen
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
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

function ListField({
	label,
	value,
	onChange,
	placeholder,
}: {
	label: string;
	value: string[];
	onChange: (v: string[]) => void;
	placeholder?: string;
}) {
	const text = value.join(", ");
	return (
		<div className="space-y-1">
			<Label>{label}</Label>
			<Input
				value={text}
				onChange={(e) => {
					const raw = e.target.value;
					if (raw.trim() === "") {
						onChange([]);
					} else {
						onChange(
							raw
								.split(",")
								.map((s) => s.trim())
								.filter(Boolean),
						);
					}
				}}
				placeholder={placeholder}
			/>
			<p className="text-muted-foreground text-xs">Komma-getrennt</p>
		</div>
	);
}
