import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { Window } from "happy-dom";
import { generateIdentity } from "@scraper/humanize";
import {
	scrapeListingPages,
	extractListings,
	loadProxies,
	type KleinanzeigenListing,
} from "../src";

const HTML_DIR = join(import.meta.dir, "..", "html");

function saveHtmlPages(pages: string[], timestamp: string) {
	mkdirSync(HTML_DIR, { recursive: true });
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
	const identity = await generateIdentity(loadProxies());
	const result = await scrapeListingPages({
		location: "Berlin",
		maxPages: 2,
		headless: false,
		identity,
	});

	if (!result.ok) {
		console.error(result.error.message);
		process.exit(1);
	}

	const htmlPages = result.value;
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	saveHtmlPages(htmlPages, timestamp);

	const listings = parseListings(htmlPages);
	const jsonFilename = `listings-${timestamp}.json`;
	writeFileSync(
		join(HTML_DIR, jsonFilename),
		JSON.stringify(listings, null, 2),
		"utf-8",
	);
	console.log(`Saved: ${jsonFilename}`);
	console.log(
		`\nExtracted ${listings.length} listings from ${htmlPages.length} pages`,
	);
}

main().catch(console.error);
