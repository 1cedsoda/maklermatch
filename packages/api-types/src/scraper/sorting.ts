import { z } from "zod";

// ─── Sorting Options ─────────────────────────────────────────

export const SORT_OPTIONS = [
	{ value: "RECOMMENDED", label: "Empfohlen" },
	{ value: "SORTING_DATE", label: "Neueste" },
	{ value: "PRICE_AMOUNT", label: "Niedrigster Preis" },
	{ value: "PRICE_AMOUNT_DESC", label: "Höchster Preis" },
] as const;

/** Validates a Kleinanzeigen sorting field value */
export const sortingSchema = z.enum([
	"RECOMMENDED",
	"SORTING_DATE",
	"PRICE_AMOUNT",
	"PRICE_AMOUNT_DESC",
]);

export type SortingOption = z.infer<typeof sortingSchema>;
