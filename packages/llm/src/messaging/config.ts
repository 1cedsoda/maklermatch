// --- Rate Limits ---
export const MAX_MESSAGES_PER_DAY = 20;
export const MIN_DELAY_SECONDS = 180; // 3 minutes
export const MAX_DELAY_SECONDS = 600; // 10 minutes
export const MAX_FOLLOWUPS_PER_SELLER = 2; // + 1 initial = 3 total

// --- Message Constraints ---
export const MAX_WORDS = 100;
export const TARGET_WORDS_MIN = 50;
export const TARGET_WORDS_MAX = 80;
export const MAX_EXCLAMATION_MARKS = 1;
export const MAX_QUESTION_MARKS = 1; // Exactly 1 CTA question

// --- SpamGuard ---
export const MIN_QUALITY_SCORE = 6; // LLM quality check, reject if below
export const MAX_GENERATION_RETRIES = 2;

// --- Follow-up Timing (days) ---
export const FOLLOWUP_1_MIN_DAYS = 3;
export const FOLLOWUP_1_MAX_DAYS = 5;
export const FOLLOWUP_2_MIN_DAYS = 10;
export const FOLLOWUP_2_MAX_DAYS = 14;

// --- Forbidden Words (instant rejection) ---
export const FORBIDDEN_WORDS = [
	// Commercial intent — Makler identity
	"Makler",
	"Maklerin",
	"Vermittlung",
	"vermitteln",
	"Provision",
	"Honorar",
	"Courtage",
	// Sales language
	"Angebot",
	"anbieten",
	"Dienstleistung",
	"Service",
	"kostenlos",
	"unverbindlich",
	"gratis",
	"Vermarktung",
	"vermarkten",
	// Collaboration pitch
	"Zusammenarbeit",
	"zusammenarbeiten",
	"Partner",
	"Partnerschaft",
	// Expertise bragging
	"jahrelange Erfahrung",
	"langjährige Erfahrung",
	"Erfahrung im Immobilienbereich",
	"Expertise",
	"Experte",
	"Expertin",
	// Client pitch
	"Netzwerk",
	"Kaufinteressenten",
	"Kundenstamm",
	"Interessenten",
	"vorgemerkte Käufer",
	// Free services pitch
	"Bewertung",
	"Wertermittlung",
	"Marktanalyse",
	"Exposé",
	// Help offers
	"helfen",
	"unterstützen",
	"Unterstützung",
	"begleiten",
	"Begleitung",
];

export const FORBIDDEN_PHRASES = [
	// Classic spam openers
	"ich habe Ihr Inserat gesehen",
	"ich habe Ihre Anzeige gesehen",
	"ich bin auf Ihre Anzeige aufmerksam geworden",
	"ich bin auf Ihr Inserat aufmerksam geworden",
	"erlauben Sie mir",
	"gestatten Sie",
	"darf ich mich vorstellen",
	"ich würde gerne",
	"ich möchte mich vorstellen",
	"ich kontaktiere Sie",
	"Ihr Objekt",
];

// Openers that make a message feel automated
export const FORBIDDEN_OPENERS = [
	"Hallo",
	"Guten Tag",
	"Guten Morgen",
	"Guten Abend",
	"Sehr geehrte",
	"Sehr geehrter",
	"Liebe ",
	"Lieber ",
	"Ich ",
	"Mein ",
	"Wir ",
];

// --- Unique Feature Detection ---
export const UNIQUE_FEATURE_KEYWORDS = [
	"Wintergarten",
	"Holzofen",
	"Kaminofen",
	"Kamin",
	"Einliegerwohnung",
	"Sauna",
	"Pool",
	"Schwimmbad",
	"Dachterrasse",
	"Fußbodenheizung",
	"Solar",
	"Photovoltaik",
	"Wärmepumpe",
	"Glasfaser",
	"Altbau",
	"Stuck",
	"Parkett",
	"Dielenboden",
	"Fachwerk",
	"Erker",
	"Galerie",
	"Loft",
	"Penthouse",
	"Maisonette",
	"Jugendstil",
	"Gewächshaus",
	"Gartenhaus",
	"Carport",
	"Doppelgarage",
	"Aufzug",
	"Fahrstuhl",
	"Smart Home",
	"Faltanlage",
	"Schiebetür",
	"Panoramafenster",
	"Einbauküche",
];

export const LIFESTYLE_KEYWORDS = [
	"Familie",
	"Kinder",
	"Kind",
	"ruhig",
	"Ruhe",
	"Natur",
	"Wald",
	"See",
	"Fluss",
	"Park",
	"Grün",
	"zentral",
	"Innenstadt",
	"Stadtmitte",
	"fußläufig",
	"Spielplatz",
	"Schule",
	"Kita",
	"Kindergarten",
	"Hund",
	"Haustier",
	"Garten",
	"Terrasse",
];

export const RENOVATION_KEYWORDS = [
	"renoviert",
	"saniert",
	"modernisiert",
	"kernsaniert",
	"Neubau",
	"neuwertig",
	"Erstbezug",
	"neues Dach",
	"neue Heizung",
	"neue Fenster",
	"neue Küche",
	"neue Bäder",
	"neue Leitungen",
	"Vollsanierung",
];

export const URGENCY_KEYWORDS = [
	"zeitnah",
	"schnell",
	"sofort",
	"baldig",
	"dringend",
	"Umzug",
	"beruflich",
	"Ausland",
];

// --- Tone Detection ---
export const INFORMAL_MARKERS = [
	"perfekt",
	"super",
	"top",
	"toll",
	"mega",
	"cool",
	"geil",
	"traumhaft",
	"Traum",
	"Paradies",
	"Oase",
	"Schmuckstück",
	"Juwel",
	"Perle",
	"...",
];

export const FORMAL_MARKERS = [
	"Exposé",
	"Objektbeschreibung",
	"zzgl.",
	"inkl.",
	"Energieausweis",
	"Energiekennwert",
	"Baurechtlich",
	"Wohneinheiten",
	"Mietrendite",
];
