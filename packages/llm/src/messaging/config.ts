// --- Rate Limits ---
export const MAX_MESSAGES_PER_DAY = 20;
export const MIN_DELAY_SECONDS = 180; // 3 minutes
export const MAX_DELAY_SECONDS = 600; // 10 minutes
export const MAX_FOLLOWUPS_PER_SELLER = 2; // + 1 initial = 3 total

// --- Message Constraints ---
export const MAX_WORDS = 60;
export const TARGET_WORDS_MIN = 25;
export const TARGET_WORDS_MAX = 50;
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
// Strategy: We're openly a Makler, so "Makler" itself is allowed.
// Block words that make messages sound like sales templates or spam.
export const FORBIDDEN_WORDS = [
	// Sales-template language
	"kostenlos",
	"unverbindlich",
	"gratis",
	"kostenfrei",
	"Vermarktung",
	"vermarkten",
	"Dienstleistung",
	// Formal collaboration pitch
	"Zusammenarbeit",
	"zusammenarbeiten",
	"Partnerschaft",
	// Expertise bragging
	"jahrelange Erfahrung",
	"langjährige Erfahrung",
	"Erfahrung im Immobilienbereich",
	"Expertise",
	"Experte",
	"Expertin",
	// Client pitch / too salesy
	"Kundenstamm",
	"vorgemerkte Käufer",
	"exklusiv",
	"Premium",
	// Free services pitch
	"Wertermittlung",
	"Marktanalyse",
	"Exposé",
	// Overly formal/corporate
	"Begleitung",
	"ganzheitlich",
	"individuell",
	"maßgeschneidert",
	"Rundum-Service",
	"Full-Service",
	"Komplettpaket",
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
	"ich möchte mich vorstellen",
	"ich kontaktiere Sie",
	// Template-language
	"kostenlose Bewertung",
	"unverbindliches Gespräch",
	"unverbindliches Angebot",
	"kostenlose Einschätzung",
	"ohne Verpflichtung",
	"keinerlei Kosten",
	"keine Kosten für Sie",
	// Fake buyer claims
	"hab einen Kunden",
	"habe einen Kunden",
	"hab einen Interessenten",
	"habe einen Interessenten",
	"hab gerade einen",
	"hab grad einen",
	"Suchkunden",
	"genau sowas sucht",
	"genau so etwas sucht",
	// Pressure tactics
	"Zeitfenster schließt sich",
	"der Markt dreht",
	"jetzt ist der richtige Zeitpunkt",
	"warten Sie nicht zu lange",
	"bevor es zu spät ist",
];

// Openers that make a message feel automated
// Note: "Hallo", "Hey", "Hi" are now ALLOWED for first contact (Erstkontakt)
export const FORBIDDEN_OPENERS = [
	"Sehr geehrte",
	"Sehr geehrter",
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

// --- Humanizer ---
export const TYPO_PROBABILITY = 0.08; // 8% of messages get a typo

// --- Delay (milliseconds) ---
export const FIRST_MESSAGE_DELAY_MIN = 120_000; // 2 min
export const FIRST_MESSAGE_DELAY_MAX = 1_200_000; // 20 min
export const ONLINE_DELAY_MIN = 5_000; // 5 sek
export const ONLINE_DELAY_MAX = 45_000; // 45 sek
export const AFK_DELAY_MIN = 60_000; // 1 min
export const AFK_DELAY_MAX = 180_000; // 3 min
export const AFK_PROBABILITY = 0.15; // 15% chance of "stepped away"
export const CHARS_PER_SECOND = 4; // typing speed for delay scaling

// --- Chat Window ---
export const CHAT_WINDOW_START_HOUR = 7;
export const CHAT_WINDOW_START_MINUTE = 22;
export const CHAT_WINDOW_END_HOUR = 24; // midnight
export const BUSINESS_HOURS_START = 9;
export const BUSINESS_HOURS_END = 17;

// --- Off-Hours (weekday outside 9-17) ---
export const OFF_HOURS_DELAY_MULTIPLIER_MIN = 3;
export const OFF_HOURS_DELAY_MULTIPLIER_MAX = 8;
export const OFF_HOURS_SKIP_PROBABILITY = 0.1; // 10% no reply

// --- Weekend (Sat + Sun) ---
export const WEEKEND_DELAY_MULTIPLIER_MIN = 5;
export const WEEKEND_DELAY_MULTIPLIER_MAX = 15;
export const WEEKEND_SKIP_PROBABILITY = 0.2; // 20% no reply

// --- Scheduler ---
export const SCHEDULER_POLL_INTERVAL_MS = 30_000; // 30s
export const MAX_INTERRUPTION_RESETS = 3;
export const JOB_PERSIST_THRESHOLD_MS = 300_000; // 5 min

// --- Safeguard ---
export const SAFEGUARD_ENABLED = true;

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
