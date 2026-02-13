import { useCallback, useEffect, useState } from "react";
import {
	api,
	type CompanyRow,
	type CompanyInput,
	type BrokerRow,
	type ZipCodeGroupRow,
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

const EMPTY_FORM: CompanyInput = {
	name: "",
	email: "",
	description: "",
	billingStreet: "",
	billingStreet2: "",
	billingCity: "",
	billingZipCode: "",
	billingCountry: "Deutschland",
	ustId: "",
	iban: "",
	bic: "",
	bankName: "",
	minPrice: null,
	maxPrice: null,
};

export function CompaniesPage() {
	const [companies, setCompanies] = useState<CompanyRow[]>([]);
	const [editing, setEditing] = useState<number | "new" | null>(null);
	const [form, setForm] = useState<CompanyInput>(EMPTY_FORM);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const load = useCallback(() => {
		api
			.getCompanies()
			.then(setCompanies)
			.catch(() => setError("Fehler beim Laden"));
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	function startNew() {
		setEditing("new");
		setForm({ ...EMPTY_FORM });
		setError("");
	}

	function startEdit(company: CompanyRow) {
		setEditing(company.id);
		setForm({
			name: company.name,
			email: company.email ?? "",
			description: company.description ?? "",
			billingStreet: company.billingStreet ?? "",
			billingStreet2: company.billingStreet2 ?? "",
			billingCity: company.billingCity ?? "",
			billingZipCode: company.billingZipCode ?? "",
			billingCountry: company.billingCountry ?? "Deutschland",
			ustId: company.ustId ?? "",
			iban: company.iban ?? "",
			bic: company.bic ?? "",
			bankName: company.bankName ?? "",
			minPrice: company.minPrice,
			maxPrice: company.maxPrice,
		});
		setError("");
	}

	function cancel() {
		setEditing(null);
		setError("");
	}

	async function save() {
		if (!form.name) {
			setError("Name ist ein Pflichtfeld");
			return;
		}
		setSaving(true);
		setError("");
		try {
			if (editing === "new") {
				await api.createCompany(form);
			} else if (typeof editing === "number") {
				await api.updateCompany(editing, form);
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
			await api.deleteCompany(id);
			load();
			if (editing === id) setEditing(null);
		} catch {
			setError("Fehler beim Löschen");
		}
	}

	function updateField<K extends keyof CompanyInput>(
		key: K,
		value: CompanyInput[K],
	) {
		setForm((prev) => ({ ...prev, [key]: value }));
	}

	function maskIban(iban: string | null): string {
		if (!iban) return "–";
		const clean = iban.replace(/\s/g, "");
		if (clean.length <= 4) return clean;
		return `****${clean.slice(-4)}`;
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">Companies</h2>
				{editing === null && (
					<Button onClick={startNew} size="sm">
						<Plus className="mr-1 h-4 w-4" />
						Neue Firma
					</Button>
				)}
			</div>

			{error && <p className="text-destructive text-sm">{error}</p>}

			{editing !== null && (
				<Card>
					<CardHeader>
						<CardTitle>
							{editing === "new" ? "Neue Firma" : "Firma bearbeiten"}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4">
							{/* Name & Email */}
							<div className="grid grid-cols-2 gap-4">
								<Field
									label="Name *"
									value={form.name}
									onChange={(v) => updateField("name", v)}
									placeholder="Musterfirma GmbH"
								/>
								<Field
									label="E-Mail"
									value={form.email ?? ""}
									onChange={(v) => updateField("email", v)}
									placeholder="info@firma.de"
									type="email"
								/>
							</div>

							{/* Min/Max Preis */}
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-1">
									<Label>Min. Price (EUR)</Label>
									<Input
										type="number"
										value={form.minPrice?.toString() ?? ""}
										onChange={(e) =>
											updateField(
												"minPrice",
												e.target.value ? Number(e.target.value) : null,
											)
										}
										placeholder="100.000"
									/>
								</div>
								<div className="space-y-1">
									<Label>Max. Price (EUR)</Label>
									<Input
										type="number"
										value={form.maxPrice?.toString() ?? ""}
										onChange={(e) =>
											updateField(
												"maxPrice",
												e.target.value ? Number(e.target.value) : null,
											)
										}
										placeholder="2.000.000"
									/>
								</div>
							</div>

							{/* PLZ Groups (only when editing existing) */}
							{typeof editing === "number" && (
								<ZipCodeGroupManager companyId={editing} />
							)}

							{/* Beschreibung */}
							<div className="border-t pt-4">
								<div className="space-y-1">
									<Label>Beschreibung</Label>
									<textarea
										className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
										rows={2}
										value={form.description ?? ""}
										onChange={(e) => updateField("description", e.target.value)}
										placeholder="Beschreibung des Unternehmens..."
									/>
								</div>
							</div>

							{/* Admin: Rechnungsadresse */}
							<div className="border-t pt-4">
								<p className="mb-3 text-sm font-medium">Rechnungsadresse</p>
								<div className="grid grid-cols-2 gap-4">
									<Field
										label="Straße"
										value={form.billingStreet ?? ""}
										onChange={(v) => updateField("billingStreet", v)}
										placeholder="Musterstraße 1"
									/>
									<Field
										label="Adresszeile 2"
										value={form.billingStreet2 ?? ""}
										onChange={(v) => updateField("billingStreet2", v)}
										placeholder="Gebäude B, 3. OG"
									/>
								</div>
								<div className="mt-2 grid grid-cols-2 gap-4">
									<div className="grid grid-cols-3 gap-2">
										<Field
											label="PLZ"
											value={form.billingZipCode ?? ""}
											onChange={(v) => updateField("billingZipCode", v)}
											placeholder="79111"
										/>
										<div className="col-span-2">
											<Field
												label="Stadt"
												value={form.billingCity ?? ""}
												onChange={(v) => updateField("billingCity", v)}
												placeholder="Freiburg"
											/>
										</div>
									</div>
									<Field
										label="Land"
										value={form.billingCountry ?? "Deutschland"}
										onChange={(v) => updateField("billingCountry", v)}
									/>
								</div>
							</div>

							{/* Admin: USt-ID */}
							<div className="grid grid-cols-2 gap-4">
								<Field
									label="USt-ID"
									value={form.ustId ?? ""}
									onChange={(v) => updateField("ustId", v)}
									placeholder="DE123456789"
								/>
							</div>

							{/* Admin: Bankdaten */}
							<div className="border-t pt-4">
								<p className="mb-3 text-sm font-medium">Bankdaten</p>
								<div className="grid grid-cols-3 gap-4">
									<Field
										label="IBAN"
										value={form.iban ?? ""}
										onChange={(v) => updateField("iban", v)}
										placeholder="DE89370400440532013000"
									/>
									<Field
										label="BIC"
										value={form.bic ?? ""}
										onChange={(v) => updateField("bic", v)}
										placeholder="COBADEFFXXX"
									/>
									<Field
										label="Bankname"
										value={form.bankName ?? ""}
										onChange={(v) => updateField("bankName", v)}
										placeholder="Commerzbank"
									/>
								</div>
							</div>

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
					<CardTitle>Alle Companies</CardTitle>
				</CardHeader>
				<CardContent>
					{companies.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Noch keine Companies angelegt.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>E-Mail</TableHead>
									<TableHead>USt-ID</TableHead>
									<TableHead>IBAN</TableHead>
									<TableHead>User</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="w-24" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{companies.map((c) => (
									<TableRow
										key={c.id}
										className={editing === c.id ? "bg-muted/50" : ""}
									>
										<TableCell className="font-medium">{c.name}</TableCell>
										<TableCell>{c.email ?? "–"}</TableCell>
										<TableCell>{c.ustId ?? "–"}</TableCell>
										<TableCell>{maskIban(c.iban)}</TableCell>
										<TableCell>{c.brokerCount ?? 0}</TableCell>
										<TableCell>
											<Badge variant={c.active ? "default" : "secondary"}>
												{c.active ? "Aktiv" : "Inaktiv"}
											</Badge>
										</TableCell>
										<TableCell>
											<div className="flex gap-1">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => startEdit(c)}
												>
													<Pencil className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleDelete(c.id)}
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

function ZipCodeGroupManager({ companyId }: { companyId: number }) {
	const [groups, setGroups] = useState<ZipCodeGroupRow[]>([]);
	const [companyBrokers, setCompanyBrokers] = useState<BrokerRow[]>([]);
	const [newZip, setNewZip] = useState("");
	const [newBrokerIds, setNewBrokerIds] = useState<number[]>([]);
	const [loading, setLoading] = useState(true);

	const load = useCallback(() => {
		setLoading(true);
		Promise.all([
			api.getZipCodeGroups(companyId),
			api.getCompany(companyId).then((c) => c.brokers),
		])
			.then(([plzRows, brokers]) => {
				setGroups(plzRows);
				const activeBrokers = brokers.filter((b) => b.active);
				setCompanyBrokers(activeBrokers);
				// Default to all brokers selected when creating new group
				setNewBrokerIds(activeBrokers.map((b) => b.id));
			})
			.catch(() => {})
			.finally(() => setLoading(false));
	}, [companyId]);

	useEffect(() => {
		load();
	}, [load]);

	async function addGroup() {
		const zipCodes = newZip
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		if (zipCodes.length === 0) return;

		await api.createZipCodeGroup(companyId, {
			zipCodes,
			brokerIds: newBrokerIds.length > 0 ? newBrokerIds : undefined,
		});
		setNewZip("");
		setNewBrokerIds(companyBrokers.map((b) => b.id));
		load();
	}

	async function updateGroupBrokers(groupId: number, brokerIds: number[]) {
		await api.updateZipCodeGroup(companyId, groupId, { brokerIds });
		load();
	}

	async function removeGroup(id: number) {
		await api.deleteZipCodeGroup(companyId, id);
		load();
	}

	function toggleBroker(current: number[], brokerId: number): number[] {
		return current.includes(brokerId)
			? current.filter((id) => id !== brokerId)
			: [...current, brokerId];
	}

	function removeBroker(brokerIds: number[], brokerId: number): number[] {
		return brokerIds.filter((id) => id !== brokerId);
	}

	function getBrokerNames(brokerIds: number[]): string {
		if (brokerIds.length === 0 || brokerIds.length === companyBrokers.length) {
			return "Alle Makler";
		}
		const names = brokerIds
			.map((id) => companyBrokers.find((b) => b.id === id)?.name)
			.filter(Boolean);
		return names.join(", ");
	}

	return (
		<div className="border-t pt-4">
			<p className="mb-3 text-sm font-medium">PLZ-Abonnements</p>

			{loading ? (
				<p className="text-muted-foreground text-sm">Laden...</p>
			) : (
				<>
					{groups.length > 0 && (
						<div className="space-y-3">
							{groups.map((g) => {
								const currentBrokerIds = g.brokers.map((gb) => gb.brokerId);
								const displayText = getBrokerNames(currentBrokerIds);

								return (
									<div key={g.id} className="rounded-md border p-3">
										<div className="flex items-start justify-between gap-2">
											<div className="min-w-0 flex-1 space-y-2">
												<p className="font-mono text-sm">
													PLZ: {g.zipCodes.join(", ")}
												</p>
												<div className="space-y-1">
													<Label className="text-xs">Makler:</Label>
													<div className="relative">
														<select
															multiple
															className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
															size={Math.min(companyBrokers.length, 4)}
															value={currentBrokerIds.map(String)}
															onChange={(e) => {
																const selected = Array.from(
																	e.target.selectedOptions,
																).map((opt) => Number(opt.value));
																updateGroupBrokers(g.id, selected);
															}}
														>
															{companyBrokers.map((b) => (
																<option key={b.id} value={b.id}>
																	{b.name}
																</option>
															))}
														</select>
													</div>
													{currentBrokerIds.length === 0 ||
													currentBrokerIds.length === companyBrokers.length ? (
														<p className="text-muted-foreground text-sm">
															Alle Makler
														</p>
													) : (
														<div className="flex flex-wrap gap-1">
															{currentBrokerIds.map((brokerId) => {
																const broker = companyBrokers.find(
																	(b) => b.id === brokerId,
																);
																if (!broker) return null;
																return (
																	<Badge
																		key={brokerId}
																		variant="secondary"
																		className="cursor-pointer gap-1 pl-2 pr-1"
																	>
																		{broker.name}
																		<button
																			onClick={() =>
																				updateGroupBrokers(
																					g.id,
																					removeBroker(
																						currentBrokerIds,
																						brokerId,
																					),
																				)
																			}
																			className="hover:bg-muted-foreground/20 rounded-sm p-0.5"
																		>
																			<X className="h-3 w-3" />
																		</button>
																	</Badge>
																);
															})}
														</div>
													)}
												</div>
											</div>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => removeGroup(g.id)}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</div>
								);
							})}
						</div>
					)}

					{groups.length === 0 && (
						<p className="text-muted-foreground mb-3 text-sm">
							Noch keine PLZ-Abonnements angelegt.
						</p>
					)}

					<div className="mt-3 space-y-3 rounded-md border p-3 bg-muted/20">
						<div className="flex items-end gap-2">
							<div className="flex-1 space-y-1">
								<Label>PLZ (kommagetrennt)</Label>
								<Input
									value={newZip}
									onChange={(e) => setNewZip(e.target.value)}
									placeholder="79098, 79100, 79104"
									onKeyDown={(e) => {
										if (e.key === "Enter") addGroup();
									}}
								/>
							</div>
							<Button onClick={addGroup} size="sm">
								<Plus className="mr-1 h-4 w-4" />
								PLZ hinzufügen
							</Button>
						</div>
						{companyBrokers.length > 0 && (
							<div className="space-y-1">
								<Label className="text-xs">Makler:</Label>
								<div className="relative">
									<select
										multiple
										className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
										size={Math.min(companyBrokers.length, 4)}
										value={newBrokerIds.map(String)}
										onChange={(e) => {
											const selected = Array.from(e.target.selectedOptions).map(
												(opt) => Number(opt.value),
											);
											setNewBrokerIds(selected);
										}}
									>
										{companyBrokers.map((b) => (
											<option key={b.id} value={b.id}>
												{b.name}
											</option>
										))}
									</select>
								</div>
								{newBrokerIds.length === 0 ||
								newBrokerIds.length === companyBrokers.length ? (
									<p className="text-muted-foreground text-sm">Alle Makler</p>
								) : (
									<div className="flex flex-wrap gap-1">
										{newBrokerIds.map((brokerId) => {
											const broker = companyBrokers.find(
												(b) => b.id === brokerId,
											);
											if (!broker) return null;
											return (
												<Badge
													key={brokerId}
													variant="secondary"
													className="cursor-pointer gap-1 pl-2 pr-1"
												>
													{broker.name}
													<button
														onClick={() =>
															setNewBrokerIds(
																removeBroker(newBrokerIds, brokerId),
															)
														}
														className="hover:bg-muted-foreground/20 rounded-sm p-0.5"
													>
														<X className="h-3 w-3" />
													</button>
												</Badge>
											);
										})}
									</div>
								)}
							</div>
						)}
					</div>
				</>
			)}
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
