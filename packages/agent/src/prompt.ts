import {
	IDENTITY,
	STYLE_RULES,
	CHAT_CHARACTER,
	injectPersona,
	extractVorname,
} from "./prompts";

export interface BrokerInfo {
	name: string;
	company: string;
	phone: string;
	email: string;
	bio: string;
}

function buildBasePrompt(persona: {
	vorname: string;
	company: string;
}): string {
	const raw = [IDENTITY, STYLE_RULES, CHAT_CHARACTER].join("\n\n");
	return injectPersona(raw, persona.vorname, persona.company);
}

export function buildSystemPrompt(
	broker?: BrokerInfo,
	listingText?: string,
): string {
	const persona = {
		vorname: extractVorname(broker?.name ?? "Max"),
		company: broker?.company ?? "Maklermatch",
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

	const brokerSection = broker.bio
		? `\n\nDEIN PROFIL:\nDu bist ${broker.name}, ${broker.company}.\nTel: ${broker.phone} | Mail: ${broker.email}\n\n${broker.bio}`
		: `\n\nDEIN PROFIL:\nDu bist ${broker.name}, ${broker.company}.\nTel: ${broker.phone} | Mail: ${broker.email}`;

	return prompt + brokerSection;
}
