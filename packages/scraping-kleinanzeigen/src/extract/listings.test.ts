import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { extractListings, parseDate } from "./listings";

function parseHTML(html: string): Document {
	const window = new Window();
	window.document.body.innerHTML = html;
	return window.document as unknown as Document;
}

const FIXTURE_HTML = readFileSync(
	join(import.meta.dir, "../fixtures/listings.html"),
	"utf-8",
);

// Fixed reference date so "Heute"/"Gestern" resolve deterministically.
// The fixture was captured on 2026-02-13, so "Heute" = Feb 13, "Gestern" = Feb 12.
const NOW = new Date("2026-02-13T18:00:00.000+01:00");

describe("parseDate", () => {
	test("returns null for null input", () => {
		expect(parseDate(null, NOW)).toBeNull();
	});

	test("parses 'Heute, HH:MM'", () => {
		const result = parseDate("Heute, 16:29", NOW);
		expect(result).not.toBeNull();
		const d = new Date(result!);
		expect(d.getFullYear()).toBe(2026);
		expect(d.getMonth()).toBe(1); // February
		expect(d.getDate()).toBe(13);
		expect(d.getHours()).toBe(16);
		expect(d.getMinutes()).toBe(29);
	});

	test("parses 'Gestern, HH:MM'", () => {
		const result = parseDate("Gestern, 18:46", NOW);
		expect(result).not.toBeNull();
		const d = new Date(result!);
		expect(d.getFullYear()).toBe(2026);
		expect(d.getMonth()).toBe(1);
		expect(d.getDate()).toBe(12);
		expect(d.getHours()).toBe(18);
		expect(d.getMinutes()).toBe(46);
	});

	test("parses 'DD.MM.YYYY'", () => {
		const result = parseDate("11.02.2026", NOW);
		expect(result).not.toBeNull();
		const d = new Date(result!);
		expect(d.getFullYear()).toBe(2026);
		expect(d.getMonth()).toBe(1);
		expect(d.getDate()).toBe(11);
	});

	test("returns null for unrecognized format", () => {
		expect(parseDate("something else", NOW)).toBeNull();
	});
});

describe("extractListings", () => {
	const doc = parseHTML(FIXTURE_HTML);
	const listings = extractListings(doc, NOW);

	test("extracts all listings", () => {
		expect(listings).toHaveLength(27);
	});

	test("extracts ad ID and URL", () => {
		expect(listings[0].id).toBe("3278084177");
		expect(listings[0].url).toContain("3278084177");
	});

	test("extracts title", () => {
		expect(listings[0].title).toContain("Zweifamilienhaus");
	});

	test("extracts description", () => {
		expect(listings[0].description).toContain("1980");
	});

	test("extracts price", () => {
		expect(listings[0].price).toContain("€");
		expect(listings[0].priceParsed).toBeGreaterThan(0);
	});

	test("extracts location", () => {
		expect(listings[0].location).toContain("Spandau");
	});

	test("date is null for top ads", () => {
		expect(listings[0].date).toBeNull();
		expect(listings[0].dateParsed).toBeNull();
		expect(listings[1].date).toBeNull();
		expect(listings[1].dateParsed).toBeNull();
	});

	test("parses 'Heute' dates", () => {
		// listings[2] has "Heute, 16:29"
		expect(listings[2].date).toBe("Heute, 16:29");
		expect(listings[2].dateParsed).not.toBeNull();
		const d = new Date(listings[2].dateParsed!);
		expect(d.getFullYear()).toBe(2026);
		expect(d.getMonth()).toBe(1);
		expect(d.getDate()).toBe(13);
		expect(d.getHours()).toBe(16);
		expect(d.getMinutes()).toBe(29);
	});

	test("parses 'Gestern' dates", () => {
		// listings[4] has "Gestern, 18:46"
		expect(listings[4].date).toBe("Gestern, 18:46");
		expect(listings[4].dateParsed).not.toBeNull();
		const d = new Date(listings[4].dateParsed!);
		expect(d.getFullYear()).toBe(2026);
		expect(d.getMonth()).toBe(1);
		expect(d.getDate()).toBe(12);
		expect(d.getHours()).toBe(18);
		expect(d.getMinutes()).toBe(46);
	});

	test("parses 'DD.MM.YYYY' dates", () => {
		// listings[10] has "11.02.2026"
		expect(listings[10].date).toBe("11.02.2026");
		expect(listings[10].dateParsed).not.toBeNull();
		const d = new Date(listings[10].dateParsed!);
		expect(d.getFullYear()).toBe(2026);
		expect(d.getMonth()).toBe(1);
		expect(d.getDate()).toBe(11);
	});

	test("extracts image URL", () => {
		expect(listings[0].imageUrl).toContain("kleinanzeigen.de");
	});

	test("extracts image count", () => {
		expect(listings[0].imageCount).toBe(20);
	});

	test("extracts tags", () => {
		expect(listings[0].tags.length).toBeGreaterThan(0);
	});
});
