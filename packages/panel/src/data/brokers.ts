export interface BrokerProfile {
	id: string;
	name: string;
	company: string;
	phone: string;
	email: string;
	bio: string;
}

export const TEST_BROKERS: BrokerProfile[] = [
	{
		id: "mueller-muenchen",
		name: "Thomas Müller",
		company: "Müller Immobilien",
		phone: "089 123 456 78",
		email: "thomas@mueller-immobilien.de",
		bio: "Lokaler Experte in München-West, dort aufgewachsen. 12 Jahre Erfahrung mit Wohnimmobilien (Einfamilienhäuser, Eigentumswohnungen). Über 200 erfolgreiche Verkäufe, durchschnittliche Vermarktungsdauer 6 Wochen. IHK-zertifiziert. Provision 3,57% inkl. MwSt. Persönliche Betreuung von A bis Z mit professionellen Fotos, Exposé und gezielter Vermarktung.",
	},
	{
		id: "weber-freiburg",
		name: "Sandra Weber",
		company: "Weber & Partner Immobilien",
		phone: "0761 456 789 01",
		email: "sandra@weber-partner-immobilien.de",
		bio: "Spezialisiert auf Freiburger Immobilienmarkt. 8 Jahre Erfahrung mit Wohnimmobilien und Mehrfamilienhäusern. Datengetriebene Bewertung kombiniert mit lokaler Marktkenntnis. Netzwerk aus über 500 vorgemerkten Kaufinteressenten. Durchschnittlicher Verkaufspreis 5% über Angebotspreis. Mitglied im IVD Süd.",
	},
	{
		id: "engel-voelkers-freiburg",
		name: "Dr. Marcus Hoffmann",
		company: "Engel & Völkers Freiburg",
		phone: "0761 888 999 00",
		email: "m.hoffmann@engelvoelkers.com",
		bio: "Premium-Segment: Villen, Anlageimmobilien, Mehrfamilienhäuser. 15 Jahre Erfahrung, Top-10 E&V Berater Deutschland. Internationales Netzwerk, Zugang zu internationalen Investoren. Promovierter Betriebswirt. Exklusive Vermarktung mit Home Staging, Imagefilm, Hochglanz-Exposé. Provision 5,95% inkl. MwSt.",
	},
	{
		id: "brecht-suedbaden",
		name: "Julia Brecht",
		company: "Brecht Immobilien GmbH",
		phone: "0761 333 444 55",
		email: "julia@brecht-immobilien.de",
		bio: "Junge, dynamische Maklerin in Südbaden und Hochschwarzwald. 6 Jahre Erfahrung, spezialisiert auf Einfamilienhäuser, Grundstücke und Neubauprojekte. Social-Media-Marketing mit gezieltem Targeting für junge Familien. 4 Wochen durchschnittliche Vermarktungsdauer. 4,9 Sterne bei Google (87 Bewertungen). Provision 3,57% nur Käuferprovision.",
	},
];
