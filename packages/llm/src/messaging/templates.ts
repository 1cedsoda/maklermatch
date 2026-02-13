import type { ListingSignals, PersonalizationResult } from "./models";
import { MessageVariant } from "./models";

// --- System prompt shared by all variants ---

const SYSTEM_PROMPT = `\
Du schreibst eine kurze, persönliche Nachricht an jemanden, der eine Immobilie auf \
Kleinanzeigen inseriert hat. Du hast die Anzeige gelesen und etwas Bestimmtes ist \
dir aufgefallen.

REGELN:
- Maximal 80 Wörter, idealerweise 50-70
- Du bist KEIN Makler und bietest NICHTS an
- Du bist eine Person mit Immobilienerfahrung, die etwas Interessantes bemerkt hat
- Beginne mit einer konkreten Beobachtung über die Immobilie (NICHT "Hallo" oder "Sehr geehrte/r")
- Genau EIN Call-to-Action: eine einfache Frage, die leicht zu beantworten ist
- Kein kommerzieller Ton, keine Verkaufssprache
- Kein "ich könnte Ihnen helfen", "Zusammenarbeit", "Angebot", "kostenlos"
- Kein "Makler", "Vermittlung", "Provision", "Vermarktung"
- Natürlich, wie eine WhatsApp-Nachricht an einen Bekannten
- KEIN Ausrufezeichen am Anfang, maximal 1 im gesamten Text
- Die Nachricht muss mit genau einer Frage enden (?)
- Schreibe KEINE Grußformel am Ende (kein "Viele Grüße", "LG", "MfG")
- Beginne NICHT mit "Ich" oder "Mein"

{toneInstruction}

{variantInstruction}
`;

const TONE_DU =
	"Duzen — schreibe informell mit 'du/ihr/euch'. Locker und freundlich.";
const TONE_SIE =
	"Siezen — schreibe mit 'Sie/Ihnen/Ihr'. Respektvoll aber nicht steif.";

// --- Variant-specific instructions ---

const VARIANT_INSTRUCTIONS: Record<MessageVariant, string> = {
	[MessageVariant.SPECIFIC_OBSERVER]: `\
STRATEGIE: "Der aufmerksame Beobachter"
Psychologie: Reziprozität + Sympathie

Deine Nachricht soll zeigen, dass du die Anzeige WIRKLICH gelesen hast. Führe mit \
einem hyper-spezifischen Detail, das dir aufgefallen ist. Zeige echte Neugier für \
etwas, worauf der Verkäufer stolz ist.

STRUKTUR:
1. Konkrete Beobachtung über ein besonderes Merkmal der Immobilie
2. Warum das deine Aufmerksamkeit geweckt hat (1 Satz)
3. Eine leichte, persönliche Frage dazu

Die Frage soll etwas sein, worüber der Verkäufer GERNE redet — z.B. die Geschichte \
hinter einer Renovation, wie sie auf die Idee für den Wintergarten kamen, etc.`,

	[MessageVariant.MARKET_INSIDER]: `\
STRATEGIE: "Der Marktkenner"
Psychologie: Autorität + Neugier

Zeige Marktkenntnis durch eine spezifische Preis-Beobachtung. Erstelle eine \
Wissenslücke, die der Verkäufer füllen will.

STRUKTUR:
1. Preis-pro-qm Beobachtung im Vergleich zum regionalen Markt
2. Eine unvollständige Andeutung ("das kann gewollt sein, aber...")
3. Offene Frage zur Preisfindung

WICHTIG: Sei NICHT belehrend oder herablassend. Formuliere es als Beobachtung, \
nicht als Kritik. Der Verkäufer soll neugierig werden, nicht defensiv.`,

	[MessageVariant.EMPATHETIC_PEER]: `\
STRATEGIE: "Der verständnisvolle Gleichgesinnte"
Psychologie: Social Proof + Sympathie

Positioniere dich als jemand, der selbst privat verkauft hat und die Herausforderungen \
kennt. Baue Rapport durch geteilte Erfahrung auf.

STRUKTUR:
1. Kurze empathische Aussage über ihre Situation (privat verkaufen ist aufwändig)
2. Minimale eigene Erfahrung teilen (1 Satz, glaubwürdig)
3. Frage nach ihren bisherigen Erfahrungen

Die Frage soll dem Verkäufer erlauben, Frust abzulassen — viele private Verkäufer \
sind genervt von Lowball-Angeboten und No-Shows.`,

	[MessageVariant.CURIOUS_NEIGHBOR]: `\
STRATEGIE: "Der neugierige Nachbar"
Psychologie: Sympathie + Knappheit

Positioniere dich als lokal verbundene Person, die das Inserat entdeckt hat. \
Betone die Seltenheit dieser Art von Objekt in der Gegend.

STRUKTUR:
1. Lokaler Bezug oder Beobachtung
2. Hinweis auf Knappheit/Besonderheit in der Region
3. Beiläufige, nachbarschaftliche Frage

Ton: So als würdest du einen Nachbarn am Gartenzaun ansprechen.`,

	[MessageVariant.QUIET_EXPERT]: `\
STRATEGIE: "Der stille Experte"
Psychologie: Autorität + Commitment

Ultra-kurze Nachricht. Maximal 35 Wörter. Selbstbewusst durch Kürze. \
Eine scharfe Beobachtung, eine Implikation, eine Ja/Nein-Frage.

STRUKTUR:
1. Fakten-Zusammenfassung in einem Satz (Preis, Fläche, Ort)
2. Eine leicht provozierende Implikation (z.B. "das wird Aufmerksamkeit bekommen, \
aber vermutlich nicht die richtige Art")
3. Einfache Ja/Nein-Frage mit minimaler Reibung

WICHTIG: Maximal 35 Wörter. Jedes Wort muss sitzen.`,

	[MessageVariant.VALUE_SPOTTER]: `\
STRATEGIE: "Der Wertentdecker"
Psychologie: Reziprozität + Autorität

Gib dem Verkäufer einen echten, nützlichen Insight über sein eigenes Objekt, \
den er vielleicht nicht bedacht hat. Reines Geben ohne zu fragen.

STRUKTUR:
1. Ein verstecktes Wertpotenzial benennen (Einliegerwohnung, Teilbarkeit, \
Mieteinnahmen, Grundstücksnutzung)
2. Kurz erklären, warum das den Wert beeinflusst (1 Satz)
3. Frage, ob sie das bei der Preisfindung berücksichtigt haben

Der Verkäufer soll denken: "Hmm, daran habe ich nicht gedacht" und antworten wollen.`,
};

// --- Follow-up templates ---

const FOLLOWUP_1_PROMPT = `\
Du schreibst eine zweite Nachricht an einen Immobilienverkäufer auf Kleinanzeigen, \
der auf deine erste Nachricht nicht geantwortet hat.

REGELN:
- Maximal 50 Wörter
- Gib einen genuinen, nützlichen Markt-Insight (z.B. vergleichbare Verkäufe in der Gegend)
- KEIN Vorwurf, dass nicht geantwortet wurde
- KEIN erneuter Call-to-Action — einfach nur wertvolle Info geben
- Kein "Makler", "Vermittlung", "Provision", "helfen", "unterstützen"
- Beginne mit "Nochmal kurz zum" oder ähnlich beiläufig
- KEINE Grußformel

{toneInstruction}

Informationen:
{listingContext}
`;

const FOLLOWUP_2_PROMPT = `\
Du schreibst eine dritte und letzte Nachricht an einen Immobilienverkäufer, der bisher \
nicht geantwortet hat. Diese Nachricht soll ehrlich und abschließend sein.

REGELN:
- Maximal 60 Wörter
- Entschuldige dich kurz für die ungebetenen Nachrichten
- Erwähne beiläufig, dass du "beruflich mit Immobilien in der Region zu tun hast"
- Biete eine "zweite Meinung zum Preis" an, falls sie jemals eine brauchen
- Beende mit "Alles Gute mit dem Verkauf" oder ähnlich
- Das ist die LETZTE Nachricht — sie soll warm und respektvoll sein
- Kein "Makler", "Vermittlung", "Provision"

{toneInstruction}

Informationen:
{listingContext}
`;

export function buildListingContext(signals: ListingSignals): string {
	const parts: string[] = [];

	parts.push(`IMMOBILIE: ${signals.propertyType}`);
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

export function buildGenerationPrompt(
	signals: ListingSignals,
	personalization: PersonalizationResult,
	variant: MessageVariant,
): [string, string] {
	const toneInstruction = signals.tone === "du" ? TONE_DU : TONE_SIE;
	const variantInstruction = VARIANT_INSTRUCTIONS[variant];

	const system = SYSTEM_PROMPT.replace(
		"{toneInstruction}",
		toneInstruction,
	).replace("{variantInstruction}", variantInstruction);

	const user =
		buildListingContext(signals) +
		"\n\n" +
		buildPersonalizationContext(signals, personalization) +
		"\n\nSchreibe jetzt die Nachricht.";

	return [system, user];
}

export function buildFollowupPrompt(
	signals: ListingSignals,
	stage: number,
): [string, string] {
	const toneInstruction = signals.tone === "du" ? TONE_DU : TONE_SIE;
	const listingContext = buildListingContext(signals);

	const template = stage === 1 ? FOLLOWUP_1_PROMPT : FOLLOWUP_2_PROMPT;
	const system = template
		.replace("{toneInstruction}", toneInstruction)
		.replace("{listingContext}", listingContext);

	const user = "Schreibe jetzt die Nachricht.";
	return [system, user];
}
