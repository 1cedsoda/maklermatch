export interface BrokerCriteria {
	plzPrefixes?: string[];
	cities?: string[];
	bundeslaender?: string[];
	propertyTypes?: string[];
	minPrice?: number;
	maxPrice?: number;
}

export interface BrokerProfile {
	id: string;
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
	criteria?: BrokerCriteria;
}

export const TEST_BROKERS: BrokerProfile[] = [
	{
		id: "mueller-muenchen",
		name: "Thomas Müller",
		firma: "Müller Immobilien",
		region: "München und Umgebung",
		spezialisierung: "Wohnimmobilien (Einfamilienhäuser, Eigentumswohnungen)",
		erfahrungJahre: 12,
		provision: "3,57% inkl. MwSt. (Käufer und Verkäufer je hälftig)",
		arbeitsweise:
			"Persönliche Betreuung von A bis Z. Erstes Kennenlerngespräch vor Ort, dann professionelle Bewertung mit Vergleichswertverfahren. Hochwertige Fotos und Exposé. Gezielte Vermarktung über Portale und eigenes Käufernetzwerk. Begleitung bis zum Notartermin.",
		leistungen: [
			"Kostenlose Erstbewertung vor Ort",
			"Professionelle Immobilienfotografie",
			"Exposé-Erstellung",
			"Vermarktung auf ImmoScout24, Immowelt, eigene Website",
			"Besichtigungen mit vorqualifizierten Interessenten",
			"Bonitätsprüfung der Käufer",
			"Preisverhandlung",
			"Begleitung zum Notartermin",
			"Übergabeprotokoll",
		],
		besonderheiten: [
			"Lokaler Experte — in München-West aufgewachsen",
			"Durchschnittliche Vermarktungsdauer: 6 Wochen",
			"Über 200 erfolgreiche Verkäufe",
			"IHK-zertifizierter Immobilienmakler",
		],
		telefon: "089 123 456 78",
		email: "thomas@mueller-immobilien.de",
		criteria: {
			plzPrefixes: ["80", "81", "82", "83", "85"],
			cities: ["München"],
			bundeslaender: ["Bayern"],
			propertyTypes: ["Haus", "Wohnung"],
			minPrice: 100_000,
			maxPrice: 3_000_000,
		},
	},
	{
		id: "weber-freiburg",
		name: "Sandra Weber",
		firma: "Weber & Partner Immobilien",
		region: "Freiburg und Breisgau",
		spezialisierung: "Wohnimmobilien und Mehrfamilienhäuser im Raum Freiburg",
		erfahrungJahre: 8,
		provision: "3,57% inkl. MwSt. (Käufer und Verkäufer je hälftig)",
		arbeitsweise:
			"Datengetriebene Bewertung kombiniert mit lokaler Marktkenntnis. Individuelle Vermarktungsstrategie für jede Immobilie. Diskreter Off-Market-Verkauf auf Wunsch. Enge Zusammenarbeit mit lokalen Notaren und Finanzierungsberatern.",
		leistungen: [
			"Marktgerechte Wertermittlung mit Vergleichsdaten",
			"Professionelle Fotos und Drohnenaufnahmen",
			"3D-Rundgänge für Online-Besichtigungen",
			"Zielgruppengerechte Vermarktung",
			"Besichtigungsmanagement",
			"Verhandlungsführung und Vertragsbegleitung",
			"Notartermin-Begleitung",
		],
		besonderheiten: [
			"Spezialisiert auf den Freiburger Immobilienmarkt",
			"Netzwerk aus über 500 vorgemerkten Kaufinteressenten",
			"Durchschnittlicher Verkaufspreis 5% über Angebotspreis",
			"Mitglied im IVD Süd",
		],
		telefon: "0761 456 789 01",
		email: "sandra@weber-partner-immobilien.de",
		criteria: {
			plzPrefixes: ["79"],
			cities: ["Freiburg"],
			bundeslaender: ["Baden-Württemberg"],
			propertyTypes: ["Haus", "Wohnung", "Mehrfamilienhaus"],
			minPrice: 150_000,
			maxPrice: 5_000_000,
		},
	},
	{
		id: "engel-voelkers-freiburg",
		name: "Dr. Marcus Hoffmann",
		firma: "Engel & Völkers Freiburg",
		region: "Freiburg, Schwarzwald, Kaiserstuhl",
		spezialisierung: "Premium-Wohnimmobilien, Villen und Anlageimmobilien",
		erfahrungJahre: 15,
		provision: "5,95% inkl. MwSt. (Käufer und Verkäufer je hälftig)",
		arbeitsweise:
			"Exklusive Vermarktung im Premium-Segment mit internationalem Netzwerk. Diskrete Ansprache vermögender Käufer. Umfassende Due-Diligence-Prüfung. Persönliche Betreuung auf höchstem Niveau mit individuellen Vermarktungskonzepten.",
		leistungen: [
			"Ausführliche Markt- und Standortanalyse",
			"Professionelles Home Staging",
			"Hochglanz-Exposé und Imagefilm",
			"Internationale Vermarktung über das E&V-Netzwerk",
			"Exklusive Käuferdatenbank",
			"Rechtliche Beratung in Kooperation mit Fachanwälten",
			"Steuerliche Erstberatung für Kapitalanleger",
			"After-Sale-Service",
		],
		besonderheiten: [
			"Top-10 Engel & Völkers Berater Deutschland",
			"Spezialist für Mehrfamilienhäuser als Kapitalanlage",
			"Zugang zu internationalen Investoren",
			"Promovierter Betriebswirt mit Immobilien-Schwerpunkt",
		],
		telefon: "0761 888 999 00",
		email: "m.hoffmann@engelvoelkers.com",
		criteria: {
			plzPrefixes: ["79"],
			cities: ["Freiburg"],
			bundeslaender: ["Baden-Württemberg"],
			propertyTypes: ["Haus", "Wohnung", "Mehrfamilienhaus"],
			minPrice: 500_000,
			maxPrice: 10_000_000,
		},
	},
	{
		id: "brecht-suedbaden",
		name: "Julia Brecht",
		firma: "Brecht Immobilien GmbH",
		region: "Südbaden und Hochschwarzwald",
		spezialisierung: "Einfamilienhäuser, Grundstücke und Neubauprojekte",
		erfahrungJahre: 6,
		provision: "3,57% inkl. MwSt. (nur Käuferprovision)",
		arbeitsweise:
			"Moderne, transparente Maklerarbeit mit Fokus auf digitale Vermarktung. Social-Media-Kampagnen auf Instagram und Facebook gezielt für junge Familien. Schnelle Reaktionszeiten und unkomplizierte Kommunikation per WhatsApp.",
		leistungen: [
			"Kostenlose Immobilienbewertung online und vor Ort",
			"Social-Media-Marketing mit gezieltem Targeting",
			"Professionelle Fotos und Videobegehung",
			"Digitales Exposé mit allen Unterlagen",
			"Koordination von Besichtigungsterminen",
			"Unterstützung bei der Finanzierung",
			"Kaufvertragsbegleitung bis zur Übergabe",
		],
		besonderheiten: [
			"Junge, dynamische Maklerin mit Social-Media-Kompetenz",
			"Durchschnittliche Vermarktungsdauer: 4 Wochen",
			"Hohe Google-Bewertung (4,9 Sterne, 87 Bewertungen)",
			"Spezialisiert auf Familien und Erstimmobilienkäufer",
		],
		telefon: "0761 333 444 55",
		email: "julia@brecht-immobilien.de",
		criteria: {
			plzPrefixes: ["79", "78"],
			bundeslaender: ["Baden-Württemberg"],
			propertyTypes: ["Haus", "Grundstück"],
			minPrice: 100_000,
			maxPrice: 2_000_000,
		},
	},
];
