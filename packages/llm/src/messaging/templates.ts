import {
	IDENTITY,
	STYLE_RULES,
	TASK_INITIAL,
	TASK_FOLLOWUP_1,
	TASK_FOLLOWUP_2,
	injectPersona,
} from "@scraper/agent";
import type { ListingSignals, PersonalizationResult } from "./models";

// --- Persona config ---

export interface MessagePersona {
	name: string;
	firma: string;
	region?: string;
}

const DEFAULT_PERSONA: MessagePersona = {
	name: "Max",
	firma: "Maklermatch",
};

// --- Tone helpers ---

function buildToneDu(vorname: string): string {
	return `ANREDE: Du. Locker, wie mit einem Bekannten. Grußformel: 'VG ${vorname}' oder 'Grüße ${vorname}'.`;
}

function buildToneSie(vorname: string): string {
	return `ANREDE: Sie. Respektvoll aber menschlich, kein Amtsdeutsch. Grußformel: 'Viele Grüße, ${vorname}' oder 'Beste Grüße, ${vorname}'.`;
}

// --- System prompt assembly ---

function buildSystemPrompt(
	task: string,
	toneInstruction: string,
	persona: MessagePersona,
): string {
	const vorname = persona.name.split(" ")[0];
	const parts = [IDENTITY, STYLE_RULES, toneInstruction, task].join("\n\n");
	return injectPersona(parts, vorname, persona.firma);
}

// --- Context builders ---

export function buildListingContext(signals: ListingSignals): string {
	const parts: string[] = [];

	parts.push(`IMMOBILIE: ${signals.propertyType}`);
	if (signals.sellerName)
		parts.push(
			`VERKÄUFER: ${signals.sellerName} (benutze den Vornamen in der Ansprache, nicht den vollen Namen!)`,
		);
	if (signals.title) parts.push(`Titel: ${signals.title}`);
	if (signals.city) parts.push(`Ort: ${signals.city} (${signals.plz})`);
	if (signals.price) {
		let priceStr = `${signals.price.toLocaleString("de-DE")}€`;
		if (signals.isVb) priceStr += " VB";
		parts.push(`Preis: ${priceStr}`);
	}
	if (signals.pricePerSqm)
		parts.push(`Preis/m²: ~${Math.round(signals.pricePerSqm)}€`);
	if (signals.wohnflaeche)
		parts.push(`Wohnfläche: ${Math.round(signals.wohnflaeche)}m²`);
	if (signals.grundstueck)
		parts.push(`Grundstück: ${Math.round(signals.grundstueck)}m²`);
	if (signals.zimmer) parts.push(`Zimmer: ${signals.zimmer}`);
	if (signals.baujahr) parts.push(`Baujahr: ${signals.baujahr}`);

	return parts.join("\n");
}

export function buildPersonalizationContext(
	signals: ListingSignals,
	personalization: PersonalizationResult,
): string {
	const parts: string[] = [];

	parts.push("PERSONALISIERUNG:");
	parts.push(
		`Hauptanker (verwende dies als Einstieg): ${personalization.primaryAnchor}`,
	);

	if (personalization.secondaryAnchors.length > 0)
		parts.push(
			`Weitere Details: ${personalization.secondaryAnchors.join(", ")}`,
		);

	if (personalization.priceInsight)
		parts.push(`Preis-Insight: ${personalization.priceInsight}`);

	if (personalization.emotionalHook)
		parts.push(`Emotionaler Aufhänger: ${personalization.emotionalHook}`);

	parts.push("\nVERKÄUFER-PSYCHOLOGIE:");
	parts.push(`Detailgrad der Anzeige: ${signals.descriptionEffort}`);
	parts.push(`Stimmung: ${signals.sellerEmotion}`);
	if (signals.isVb) parts.push("Preis ist verhandelbar (VB)");
	if (signals.hasProvisionNote)
		parts.push("Verkäufer erwähnt Provision = ist sich Makler-Dynamik bewusst");

	if (signals.renovationHistory)
		parts.push(`Renovierung: ${signals.renovationHistory}`);

	if (signals.lifestyleSignals.length > 0)
		parts.push(
			`Lifestyle-Signale: ${signals.lifestyleSignals.slice(0, 5).join(", ")}`,
		);

	if (signals.uniqueFeatures.length > 0)
		parts.push(
			`Besondere Merkmale: ${signals.uniqueFeatures.slice(0, 5).join("; ")}`,
		);

	return parts.join("\n");
}

// --- Public prompt builders ---

export function buildGenerationPrompt(
	signals: ListingSignals,
	personalization: PersonalizationResult,
	persona: MessagePersona = DEFAULT_PERSONA,
): [string, string] {
	const vorname = persona.name.split(" ")[0];
	const toneInstruction =
		signals.tone === "du" ? buildToneDu(vorname) : buildToneSie(vorname);

	const system = buildSystemPrompt(TASK_INITIAL, toneInstruction, persona);

	const sellerInstruction = signals.sellerName
		? `\n\nDer Verkäufer heißt ${signals.sellerName}. Benutze nur den Vornamen in der Ansprache.`
		: "";

	const user =
		buildListingContext(signals) +
		"\n\n" +
		buildPersonalizationContext(signals, personalization) +
		sellerInstruction +
		"\n\nSchreibe jetzt die Nachricht.";

	return [system, user];
}

export function buildFollowupPrompt(
	signals: ListingSignals,
	stage: number,
	persona: MessagePersona = DEFAULT_PERSONA,
): [string, string] {
	const vorname = persona.name.split(" ")[0];
	const toneInstruction =
		signals.tone === "du" ? buildToneDu(vorname) : buildToneSie(vorname);

	const task = stage === 1 ? TASK_FOLLOWUP_1 : TASK_FOLLOWUP_2;
	const system = buildSystemPrompt(task, toneInstruction, persona);

	const user =
		buildListingContext(signals) + "\n\nSchreibe jetzt die Nachricht.";

	return [system, user];
}
