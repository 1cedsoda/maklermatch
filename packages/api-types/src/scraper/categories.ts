import { z } from "zod";

// ─── Category Tree ──────────────────────────────────────────
// All Kleinanzeigen categories with URL slugs and numeric IDs.
// IDs (as strings) are used as primary keys to avoid slug collisions
// (e.g. "Dienstleistungen > Auto, Rad & Boot" c289 vs top-level c210).

export interface CategoryNode {
	/** URL path segment, e.g. "haus-kaufen" → /s-haus-kaufen/c208 */
	slug: string;
	/** Kleinanzeigen numeric category ID */
	id: number;
	/** German display name */
	name: string;
	/** Subcategories (empty array for leaf nodes) */
	children: CategoryNode[];
}

export const CATEGORY_TREE: CategoryNode[] = [
	{
		slug: "auto-rad-boot",
		id: 210,
		name: "Auto, Rad & Boot",
		children: [
			{ slug: "autos", id: 216, name: "Autos", children: [] },
			{
				slug: "fahrraeder",
				id: 217,
				name: "Fahrräder & Zubehör",
				children: [],
			},
			{
				slug: "autoteile-reifen",
				id: 223,
				name: "Autoteile & Reifen",
				children: [],
			},
			{
				slug: "boote-bootszubehoer",
				id: 211,
				name: "Boote & Bootszubehör",
				children: [],
			},
			{
				slug: "motorraeder-roller",
				id: 305,
				name: "Motorräder & Motorroller",
				children: [],
			},
			{
				slug: "motorraeder-roller-teile",
				id: 306,
				name: "Motorradteile & Zubehör",
				children: [],
			},
			{
				slug: "anhaenger-nutzfahrzeuge",
				id: 276,
				name: "Nutzfahrzeuge & Anhänger",
				children: [],
			},
			{
				slug: "reparaturen-dienstleistungen",
				id: 280,
				name: "Reparaturen & Dienstleistungen",
				children: [],
			},
			{
				slug: "wohnwagen-mobile",
				id: 220,
				name: "Wohnwagen & -mobile",
				children: [],
			},
			{
				slug: "auto-rad-boot/sonstiges",
				id: 241,
				name: "Weiteres Auto, Rad & Boot",
				children: [],
			},
		],
	},
	{
		slug: "immobilien",
		id: 195,
		name: "Immobilien",
		children: [
			{
				slug: "neubauprojekte",
				id: 403,
				name: "Neubauprojekte",
				children: [],
			},
			{
				slug: "wohnung-mieten",
				id: 203,
				name: "Mietwohnungen",
				children: [],
			},
			{
				slug: "haus-kaufen",
				id: 208,
				name: "Häuser zum Kauf",
				children: [],
			},
			{ slug: "auf-zeit-wg", id: 199, name: "Auf Zeit & WG", children: [] },
			{ slug: "container", id: 402, name: "Container", children: [] },
			{
				slug: "wohnung-kaufen",
				id: 196,
				name: "Eigentumswohnungen",
				children: [],
			},
			{
				slug: "ferienwohnung-ferienhaus",
				id: 275,
				name: "Ferien- & Auslandsimmobilien",
				children: [],
			},
			{
				slug: "garage-lagerraum",
				id: 197,
				name: "Garagen & Stellplätze",
				children: [],
			},
			{
				slug: "gewerbeimmobilien",
				id: 277,
				name: "Gewerbeimmobilien",
				children: [],
			},
			{
				slug: "grundstuecke-garten",
				id: 207,
				name: "Grundstücke & Gärten",
				children: [],
			},
			{
				slug: "haus-mieten",
				id: 205,
				name: "Häuser zur Miete",
				children: [],
			},
			{
				slug: "umzug-transport",
				id: 238,
				name: "Umzug & Transport",
				children: [],
			},
			{
				slug: "immobilien/sonstiges",
				id: 198,
				name: "Weitere Immobilien",
				children: [],
			},
		],
	},
	{
		slug: "haus-garten",
		id: 80,
		name: "Haus & Garten",
		children: [
			{
				slug: "kueche-esszimmer",
				id: 86,
				name: "Küche & Esszimmer",
				children: [],
			},
			{ slug: "wohnzimmer", id: 88, name: "Wohnzimmer", children: [] },
			{ slug: "badezimmer", id: 91, name: "Badezimmer", children: [] },
			{ slug: "bueromoebel", id: 93, name: "Büro", children: [] },
			{ slug: "dekoration", id: 246, name: "Dekoration", children: [] },
			{
				slug: "dienstleistungen-haus-garten",
				id: 239,
				name: "Dienstleistungen Haus & Garten",
				children: [],
			},
			{
				slug: "garten-pflanzen",
				id: 89,
				name: "Gartenzubehör & Pflanzen",
				children: [],
			},
			{ slug: "heimtextilien", id: 90, name: "Heimtextilien", children: [] },
			{ slug: "heimwerken", id: 84, name: "Heimwerken", children: [] },
			{
				slug: "lampen-licht",
				id: 82,
				name: "Lampen & Licht",
				children: [],
			},
			{ slug: "schlafzimmer", id: 81, name: "Schlafzimmer", children: [] },
			{
				slug: "haus-garten/sonstiges",
				id: 87,
				name: "Weiteres Haus & Garten",
				children: [],
			},
		],
	},
	{
		slug: "mode-beauty",
		id: 153,
		name: "Mode & Beauty",
		children: [
			{
				slug: "kleidung-damen",
				id: 154,
				name: "Damenbekleidung",
				children: [],
			},
			{
				slug: "kleidung-herren",
				id: 160,
				name: "Herrenbekleidung",
				children: [],
			},
			{
				slug: "beauty-gesundheit",
				id: 224,
				name: "Beauty & Gesundheit",
				children: [],
			},
			{
				slug: "schuhe-damen",
				id: 159,
				name: "Damenschuhe",
				children: [],
			},
			{
				slug: "schuhe-herren",
				id: 158,
				name: "Herrenschuhe",
				children: [],
			},
			{
				slug: "accessoires-schmuck",
				id: 156,
				name: "Taschen & Accessoires",
				children: [],
			},
			{
				slug: "uhren-schmuck",
				id: 157,
				name: "Uhren & Schmuck",
				children: [],
			},
			{
				slug: "mode-beauty/sonstiges",
				id: 155,
				name: "Weiteres Mode & Beauty",
				children: [],
			},
		],
	},
	{
		slug: "multimedia-elektronik",
		id: 161,
		name: "Elektronik",
		children: [
			{
				slug: "handy-telekom",
				id: 173,
				name: "Handy & Telefon",
				children: [],
			},
			{
				slug: "haushaltsgeraete",
				id: 176,
				name: "Haushaltsgeräte",
				children: [],
			},
			{ slug: "audio-hifi", id: 172, name: "Audio & Hifi", children: [] },
			{
				slug: "dienstleistungen-edv",
				id: 226,
				name: "Dienstleistungen Elektronik",
				children: [],
			},
			{ slug: "foto", id: 245, name: "Foto", children: [] },
			{ slug: "konsolen", id: 279, name: "Konsolen", children: [] },
			{ slug: "notebooks", id: 278, name: "Notebooks", children: [] },
			{ slug: "pcs", id: 228, name: "PCs", children: [] },
			{
				slug: "pc-zubehoer-software",
				id: 225,
				name: "PC-Zubehör & Software",
				children: [],
			},
			{
				slug: "tablets-reader",
				id: 285,
				name: "Tablets & Reader",
				children: [],
			},
			{ slug: "tv-video", id: 175, name: "TV & Video", children: [] },
			{
				slug: "pc-videospiele",
				id: 227,
				name: "Videospiele",
				children: [],
			},
			{
				slug: "multimedia-elektronik/sonstiges",
				id: 168,
				name: "Weitere Elektronik",
				children: [],
			},
		],
	},
	{
		slug: "haustiere",
		id: 130,
		name: "Haustiere",
		children: [
			{ slug: "hunde", id: 134, name: "Hunde", children: [] },
			{ slug: "katzen", id: 136, name: "Katzen", children: [] },
			{ slug: "fische", id: 138, name: "Fische", children: [] },
			{ slug: "kleintiere", id: 132, name: "Kleintiere", children: [] },
			{ slug: "nutztiere", id: 135, name: "Nutztiere", children: [] },
			{ slug: "pferde", id: 139, name: "Pferde", children: [] },
			{
				slug: "tierbetreuung-training",
				id: 133,
				name: "Tierbetreuung & Training",
				children: [],
			},
			{
				slug: "vermisste-tiere",
				id: 283,
				name: "Vermisste Tiere",
				children: [],
			},
			{ slug: "vogel", id: 243, name: "Vögel", children: [] },
			{ slug: "zubehoer", id: 313, name: "Zubehör", children: [] },
		],
	},
	{
		slug: "familie-kind-baby",
		id: 17,
		name: "Familie, Kind & Baby",
		children: [
			{
				slug: "baby-kinderkleidung",
				id: 22,
				name: "Baby- & Kinderkleidung",
				children: [],
			},
			{
				slug: "kinderwagen-buggys",
				id: 25,
				name: "Kinderwagen & Buggys",
				children: [],
			},
			{ slug: "altenpflege", id: 236, name: "Altenpflege", children: [] },
			{
				slug: "baby-kinderschuhe",
				id: 19,
				name: "Baby- & Kinderschuhe",
				children: [],
			},
			{
				slug: "babyausstattung",
				id: 258,
				name: "Baby-Ausstattung",
				children: [],
			},
			{
				slug: "babyschalen-kindersitze",
				id: 21,
				name: "Babyschalen & Kindersitze",
				children: [],
			},
			{
				slug: "babysitter-kinderbetreuung",
				id: 237,
				name: "Babysitter/-in & Kinderbetreuung",
				children: [],
			},
			{
				slug: "kinderzimmermoebel",
				id: 20,
				name: "Kinderzimmermöbel",
				children: [],
			},
			{ slug: "spielzeug", id: 23, name: "Spielzeug", children: [] },
			{
				slug: "familie-kind-baby/sonstiges",
				id: 18,
				name: "Weiteres Familie, Kind & Baby",
				children: [],
			},
		],
	},
	{
		slug: "jobs",
		id: 102,
		name: "Jobs",
		children: [
			{
				slug: "gastronomie-tourismus",
				id: 110,
				name: "Gastronomie & Tourismus",
				children: [],
			},
			{
				slug: "bau-handwerk-produktion",
				id: 111,
				name: "Bau, Handwerk & Produktion",
				children: [],
			},
			{
				slug: "heimarbeit-mini-nebenjobs",
				id: 107,
				name: "Mini- & Nebenjobs",
				children: [],
			},
			{ slug: "ausbildung", id: 118, name: "Ausbildung", children: [] },
			{
				slug: "bueroarbeit-verwaltung",
				id: 114,
				name: "Büroarbeit & Verwaltung",
				children: [],
			},
			{
				slug: "kundenservice-callcenter",
				id: 105,
				name: "Kundenservice & Call Center",
				children: [],
			},
			{ slug: "praktika", id: 125, name: "Praktika", children: [] },
			{
				slug: "sozialer-sektor-pflege",
				id: 123,
				name: "Sozialer Sektor & Pflege",
				children: [],
			},
			{
				slug: "transport-logistik-verkehr",
				id: 247,
				name: "Transport, Logistik & Verkehr",
				children: [],
			},
			{
				slug: "vertrieb-einkauf-verkauf",
				id: 117,
				name: "Vertrieb, Einkauf & Verkauf",
				children: [],
			},
			{
				slug: "sonstige-berufe",
				id: 109,
				name: "Weitere Jobs",
				children: [],
			},
		],
	},
	{
		slug: "freizeit-nachbarschaft",
		id: 185,
		name: "Freizeit, Hobby & Nachbarschaft",
		children: [
			{
				slug: "kunst",
				id: 240,
				name: "Kunst & Antiquitäten",
				children: [],
			},
			{ slug: "sammeln", id: 234, name: "Sammeln", children: [] },
			{
				slug: "esoterik-spirituelles",
				id: 232,
				name: "Esoterik & Spirituelles",
				children: [],
			},
			{
				slug: "essen-trinken",
				id: 248,
				name: "Essen & Trinken",
				children: [],
			},
			{
				slug: "freizeitaktivitaeten",
				id: 187,
				name: "Freizeitaktivitäten",
				children: [],
			},
			{
				slug: "handarbeit-basteln-kunsthandwerk",
				id: 282,
				name: "Handarbeit, Basteln & Kunsthandwerk",
				children: [],
			},
			{
				slug: "kuenstler-musiker",
				id: 191,
				name: "Künstler/-in & Musiker/-in",
				children: [],
			},
			{ slug: "modellbau", id: 249, name: "Modellbau", children: [] },
			{
				slug: "reise-eventservices",
				id: 233,
				name: "Reise & Eventservices",
				children: [],
			},
			{
				slug: "sport-camping",
				id: 230,
				name: "Sport & Camping",
				children: [],
			},
			{
				slug: "troedel-kistenweise",
				id: 250,
				name: "Trödel",
				children: [],
			},
			{
				slug: "verloren-gefunden",
				id: 189,
				name: "Verloren & Gefunden",
				children: [],
			},
			{
				slug: "freizeit-nachbarschaft/sonstiges",
				id: 242,
				name: "Weiteres Freizeit, Hobby & Nachbarschaft",
				children: [],
			},
		],
	},
	{
		slug: "musik-film-buecher",
		id: 73,
		name: "Musik, Filme & Bücher",
		children: [
			{
				slug: "buecher-zeitschriften",
				id: 76,
				name: "Bücher & Zeitschriften",
				children: [],
			},
			{ slug: "film-dvd", id: 79, name: "Film & DVD", children: [] },
			{
				slug: "buero-schreibwaren",
				id: 281,
				name: "Büro & Schreibwaren",
				children: [],
			},
			{ slug: "comics", id: 284, name: "Comics", children: [] },
			{
				slug: "fachbuecher-schule-studium",
				id: 77,
				name: "Fachbücher, Schule & Studium",
				children: [],
			},
			{ slug: "musik-cds", id: 78, name: "Musik & CDs", children: [] },
			{
				slug: "musikinstrumente",
				id: 74,
				name: "Musikinstrumente",
				children: [],
			},
			{
				slug: "musik-film-buecher/sonstiges",
				id: 75,
				name: "Weitere Musik, Filme & Bücher",
				children: [],
			},
		],
	},
	{
		slug: "eintrittskarten-tickets",
		id: 231,
		name: "Eintrittskarten & Tickets",
		children: [
			{ slug: "konzerte", id: 255, name: "Konzerte", children: [] },
			{
				slug: "comedy-kabarett",
				id: 254,
				name: "Comedy & Kabarett",
				children: [],
			},
			{ slug: "gutscheine", id: 287, name: "Gutscheine", children: [] },
			{ slug: "kinder", id: 252, name: "Kinder", children: [] },
			{ slug: "sport", id: 257, name: "Sport", children: [] },
			{
				slug: "klassik-kultur",
				id: 251,
				name: "Theater & Musical",
				children: [],
			},
			{
				slug: "sonstige",
				id: 256,
				name: "Weitere Eintrittskarten & Tickets",
				children: [],
			},
		],
	},
	{
		slug: "dienstleistungen",
		id: 297,
		name: "Dienstleistungen",
		children: [
			{
				slug: "auto-rad-boot",
				id: 289,
				name: "Auto, Rad & Boot",
				children: [],
			},
			{
				slug: "babysitter-kinderbetreuung",
				id: 290,
				name: "Babysitter/-in & Kinderbetreuung",
				children: [],
			},
			{ slug: "haus-garten", id: 291, name: "Haus & Garten", children: [] },
			{ slug: "altenpflege", id: 288, name: "Altenpflege", children: [] },
			{
				slug: "multimedia-elektronik",
				id: 293,
				name: "Elektronik",
				children: [],
			},
			{
				slug: "kuenstler-musiker",
				id: 292,
				name: "Künstler/-in & Musiker/-in",
				children: [],
			},
			{
				slug: "reise-event",
				id: 294,
				name: "Reise & Event",
				children: [],
			},
			{
				slug: "tierbetreuung-training",
				id: 295,
				name: "Tierbetreuung & Training",
				children: [],
			},
			{
				slug: "umzug-transport",
				id: 296,
				name: "Umzug & Transport",
				children: [],
			},
			{
				slug: "sonstige",
				id: 298,
				name: "Weitere Dienstleistungen",
				children: [],
			},
		],
	},
	{
		slug: "zu-verschenken-tauschen",
		id: 272,
		name: "Verschenken & Tauschen",
		children: [
			{
				slug: "zu-verschenken",
				id: 192,
				name: "Verschenken",
				children: [],
			},
			{ slug: "verleihen", id: 274, name: "Verleihen", children: [] },
		],
	},
	{
		slug: "unterricht-kurse",
		id: 235,
		name: "Unterricht & Kurse",
		children: [
			{ slug: "nachhilfe", id: 268, name: "Nachhilfe", children: [] },
			{
				slug: "computerkurse",
				id: 260,
				name: "Computerkurse",
				children: [],
			},
			{
				slug: "esoterik-spirituelles",
				id: 265,
				name: "Esoterik & Spirituelles",
				children: [],
			},
			{
				slug: "kochen-backen",
				id: 263,
				name: "Kochen & Backen",
				children: [],
			},
			{
				slug: "kunst-gestaltung",
				id: 264,
				name: "Kunst & Gestaltung",
				children: [],
			},
			{
				slug: "musik-gesang",
				id: 262,
				name: "Musik & Gesang",
				children: [],
			},
			{ slug: "sportkurse", id: 261, name: "Sportkurse", children: [] },
			{ slug: "sprachkurse", id: 271, name: "Sprachkurse", children: [] },
			{ slug: "tanzkurse", id: 267, name: "Tanzkurse", children: [] },
			{ slug: "weiterbildung", id: 266, name: "Weiterbildung", children: [] },
			{
				slug: "sonstige",
				id: 270,
				name: "Weitere Unterricht & Kurse",
				children: [],
			},
		],
	},
	{
		slug: "nachbarschaftshilfe",
		id: 400,
		name: "Nachbarschaftshilfe",
		children: [
			{
				slug: "nachbarschaftshilfe",
				id: 401,
				name: "Nachbarschaftshilfe",
				children: [],
			},
		],
	},
];

// ─── Derived flat map (keyed by ID string) ──────────────────

export interface CategoryInfo {
	slug: string;
	id: number;
	name: string;
	parentName: string | null;
}

function buildCategoryMap(tree: CategoryNode[]): Map<string, CategoryInfo> {
	const map = new Map<string, CategoryInfo>();
	for (const parent of tree) {
		map.set(String(parent.id), {
			slug: parent.slug,
			id: parent.id,
			name: parent.name,
			parentName: null,
		});
		for (const child of parent.children) {
			map.set(String(child.id), {
				slug: child.slug,
				id: child.id,
				name: child.name,
				parentName: parent.name,
			});
		}
	}
	return map;
}

export const CATEGORIES = buildCategoryMap(CATEGORY_TREE);

// ─── Zod schema ─────────────────────────────────────────────

const allIds = Array.from(CATEGORIES.keys()) as [string, ...string[]];

/** Validates a category ID string (e.g. "208" for Häuser zum Kauf) */
export const categoryIdSchema = z.enum(allIds);

export type CategoryId = z.infer<typeof categoryIdSchema>;

// ─── Helpers ────────────────────────────────────────────────

export function getCategoryById(id: string): CategoryInfo | undefined {
	return CATEGORIES.get(id);
}
