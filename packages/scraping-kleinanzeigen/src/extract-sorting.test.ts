import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { extractSorting } from "./extract-sorting";

function parseHTML(html: string): Document {
	const window = new Window();
	window.document.body.innerHTML = html;
	return window.document as unknown as Document;
}

const FIXTURE_HTML = readFileSync(
	join(import.meta.dir, "fixtures/sorting.html"),
	"utf-8",
);

describe("extractSorting", () => {
	const doc = parseHTML(FIXTURE_HTML);
	const sorting = extractSorting(doc);

	test("extracts selected sort option", () => {
		expect(sorting.selected).toBe("SORTING_DATE");
	});

	test("extracts all 4 sort options", () => {
		expect(sorting.options).toHaveLength(4);
	});

	test("extracts option values", () => {
		const values = sorting.options.map((o) => o.value);
		expect(values).toEqual([
			"RECOMMENDED",
			"SORTING_DATE",
			"PRICE_AMOUNT",
			"PRICE_AMOUNT_DESC",
		]);
	});

	test("extracts option labels", () => {
		const labels = sorting.options.map((o) => o.label);
		expect(labels).toEqual([
			"Empfohlen",
			"Neueste",
			"Niedrigster Preis",
			"Höchster Preis",
		]);
	});

	test("returns defaults when no sorting container exists", () => {
		const emptyDoc = parseHTML("<div>no sorting here</div>");
		const result = extractSorting(emptyDoc);
		expect(result.selected).toBe("SORTING_DATE");
		expect(result.options).toEqual([]);
	});

	test("extracts selected from hidden input", () => {
		const customDoc = parseHTML(`
			<div class="srchresult-sorting">
				<input type="hidden" name="sortingField" value="PRICE_AMOUNT">
				<ul class="textdropdown-options">
					<li class="selectbox-option" data-value="PRICE_AMOUNT" role="option">Niedrigster Preis</li>
				</ul>
			</div>
		`);
		const result = extractSorting(customDoc);
		expect(result.selected).toBe("PRICE_AMOUNT");
	});
});
