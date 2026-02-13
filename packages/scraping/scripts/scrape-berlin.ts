import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { Window } from "happy-dom";
import {
	scrapeListingPages,
	extractListings,
	type KleinanzeigenListing,
} from "../src";

const HTML_DIR = join(import.meta.dir, "..", "html");

function saveHtmlPages(pages: string[]) {
	mkdirSync(HTML_DIR, { recursive: true });
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	for (let i = 0; i < pages.length; i++) {
		const filename = `listings-p${i + 1}-${timestamp}.html`;
		writeFileSync(join(HTML_DIR, filename), pages[i], "utf-8");
		console.log(`Saved: ${filename}`);
	}
}

function parseListings(pages: string[]): KleinanzeigenListing[] {
	const all: KleinanzeigenListing[] = [];
	for (const html of pages) {
		const window = new Window();
		window.document.body.innerHTML = html;
		const doc = window.document as unknown as Document;
		all.push(...extractListings(doc));
		window.close();
	}
	return all;
}

async function main() {
	const result = await scrapeListingPages("Berlin");
	if (!result.ok) {
		console.error(result.error.message);
		process.exit(1);
	}

	const htmlPages = result.value;
	saveHtmlPages(htmlPages);

	const listings = parseListings(htmlPages);
	console.log(
		`\nExtracted ${listings.length} listings from ${htmlPages.length} pages:\n`,
	);
	console.log(JSON.stringify(listings, null, 2));
}

main().catch(console.error);
