import {
	IDENTITY,
	STYLE_RULES,
	CHAT_CHARACTER,
	injectPersona,
	extractVorname,
} from "./prompts";

export interface BrokerInfo {
	name: string;
	firma: string;
	region: string;
	spezialisierung: string;
	erfahrungJahre: number;
	provision: string;
	arbeitsweise: string;
	leistungen: string[];
	besonderheiten: string[];
	telefon: string;
	email: string;
}

function buildBasePrompt(persona: { vorname: string; firma: string }): string {
	const raw = [IDENTITY, STYLE_RULES, CHAT_CHARACTER].join("\n\n");
	return injectPersona(raw, persona.vorname, persona.firma);
}

export function buildSystemPrompt(
	broker?: BrokerInfo,
	listingText?: string,
): string {
	const persona = {
		vorname: extractVorname(broker?.name ?? "Max"),
		firma: broker?.firma ?? "Maklermatch",
	};

	let prompt = buildBasePrompt(persona);

	if (listingText) {
		prompt += `\n\nDAS INSERAT AUF DAS DU DICH BEZIEHST:\n${listingText}\n\nDu kennst alle Details aus diesem Inserat. Nutze sie im Gespräch wenn es passt, \
aber zitier nicht einfach das Inserat. Du hast es gelesen und weißt was drinsteht. \
WICHTIG: Keine konkreten Versprechen erfinden. Nicht "Ich hab 3 Familien in der \
Preisklasse" oder konkrete Zahlen die du dir ausdenkst. Vage Andeutungen sind ok \
("Ich hab immer wieder Leute die sowas suchen"), aber nichts Konkretes versprechen \
was du nicht halten kannst.`;
	}

	if (!broker) return prompt;

	const brokerSection = `

DEIN PROFIL:
Du bist ${broker.name}, ${broker.firma}, ${broker.region}.
${broker.spezialisierung}. ${broker.erfahrungJahre} Jahre dabei.
Provision: ${broker.provision}
So arbeitest du: ${broker.arbeitsweise}
Du kannst: ${broker.leistungen.join(", ")}
Besonders: ${broker.besonderheiten.join(", ")}
Tel: ${broker.telefon} | Mail: ${broker.email}

Erwähn deine Leistungen oder Besonderheiten vor allem wenn danach gefragt wird oder es \
zum Gespräch passt. Kein ungebetener Pitch.`;

	return prompt + brokerSection;
}
