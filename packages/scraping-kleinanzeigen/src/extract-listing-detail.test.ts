import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { extractListingDetail } from "./extract-listing-detail";

const FIXTURE = readFileSync(
	join(import.meta.dir, "fixtures", "listing-detail.html"),
	"utf-8",
);

const FIXTURE_PRIVATE_ANONYMOUS = readFileSync(
	join(import.meta.dir, "fixtures", "private-seller-anonymous.html"),
	"utf-8",
);

const FIXTURE_PRIVATE_NAMED = readFileSync(
	join(import.meta.dir, "fixtures", "private-seller-named.html"),
	"utf-8",
);

const FIXTURE_COMMERCIAL_BIZTEASER = readFileSync(
	join(import.meta.dir, "fixtures", "commercial-seller-bizteaser.html"),
	"utf-8",
);

const FIXTURE_PRIVATE_NO_OTHER_ADS = readFileSync(
	join(import.meta.dir, "fixtures", "private-seller-no-other-ads.html"),
	"utf-8",
);

const FIXTURE_COMMERCIAL_BIZTEASER_PHONE = readFileSync(
	join(import.meta.dir, "fixtures", "commercial-seller-bizteaser-phone.html"),
	"utf-8",
);

const FIXTURE_COMMERCIAL_BIZTEASER_VONPOLL = readFileSync(
	join(import.meta.dir, "fixtures", "commercial-seller-bizteaser-vonpoll.html"),
	"utf-8",
);

const FIXTURE_COMMERCIAL_BIZTEASER_VONPOLL_TEMPELHOF = readFileSync(
	join(
		import.meta.dir,
		"fixtures",
		"commercial-seller-bizteaser-vonpoll-tempelhof.html",
	),
	"utf-8",
);

function parseHTML(html: string): Document {
	const window = new Window();
	window.document.write(html);
	return window.document as unknown as Document;
}

describe("extractListingDetail", () => {
	const doc = parseHTML(FIXTURE);
	const detail = extractListingDetail(doc);

	test("extracts ID from canonical URL", () => {
		expect(detail.id).toBe("3312858436");
	});

	test("extracts canonical URL", () => {
		expect(detail.url).toBe(
			"https://www.kleinanzeigen.de/s-anzeige/ihr-traumhaus-in-perfekter-lage/3312858436-208-20982",
		);
	});

	test("extracts title", () => {
		expect(detail.title).toBe("Ihr Traumhaus in perfekter Lage");
	});

	test("extracts price text", () => {
		expect(detail.price).toBe("607.000 €");
	});

	test("extracts parsed price from meta tag", () => {
		expect(detail.priceParsed).toBe(607000.0);
	});

	test("extracts location from viewad-main-info", () => {
		expect(detail.location).toBe("21521 Herzogtum Lauenburg - Dassendorf");
	});

	test("extracts date", () => {
		expect(detail.date).toBe("13.02.2026");
	});

	test("extracts category", () => {
		expect(detail.category).toBe("Häuser zum Kauf");
	});

	test("extracts image URLs", () => {
		expect(detail.imageUrls).toHaveLength(7);
		expect(detail.imageUrls[0]).toBe(
			"https://img.kleinanzeigen.de/api/v1/prod-ads/images/ce/cefb9ecf-3652-4f1a-970c-1dc719c39806?rule=$_59.AUTO",
		);
	});

	test("extracts details key-value pairs", () => {
		expect(detail.details["Wohnfläche"]).toBe("98 m²");
		expect(detail.details["Zimmer"]).toBe("3");
		expect(detail.details["Schlafzimmer"]).toBe("2");
		expect(detail.details["Badezimmer"]).toBe("2");
		expect(detail.details["Grundstücksfläche"]).toBe("600 m²");
		expect(detail.details["Haustyp"]).toBe("Einfamilienhaus freistehend");
		expect(detail.details["Etagen"]).toBe("2");
		expect(detail.details["Baujahr"]).toBe("2025");
		expect(detail.details["Provision"]).toBe(
			"Keine zusätzliche Käuferprovision",
		);
	});

	test("extracts features (checktags)", () => {
		expect(detail.features).toEqual([
			"Gäste-WC",
			"Stufenloser Zugang",
			"Fußbodenheizung",
		]);
	});

	test("extracts coordinates", () => {
		expect(detail.latitude).toBe(53.48967969477543);
		expect(detail.longitude).toBe(10.374486922519282);
	});

	test("extracts view count", () => {
		expect(detail.viewCount).toBe(39);
	});

	test("extracts description", () => {
		expect(detail.description).toContain("Willkommen in Ihrem neuen Zuhause");
		expect(detail.description).toContain("lichtdurchflutete Räume");
	});

	test("extracts seller name", () => {
		expect(detail.seller.name).toBe("massa haus - Mike Rehders");
	});

	test("extracts seller userId", () => {
		expect(detail.seller.userId).toBe("149068321");
	});

	test("extracts seller type as commercial", () => {
		expect(detail.seller.type).toBe("commercial");
	});

	test("extracts seller active since date", () => {
		expect(detail.seller.activeSince).toBe("26.02.2025");
	});

	test("extracts seller other ads count", () => {
		expect(detail.seller.otherAdsCount).toBe(115);
	});
});

describe("extractListingDetail – private seller (anonymous)", () => {
	const doc = parseHTML(FIXTURE_PRIVATE_ANONYMOUS);
	const detail = extractListingDetail(doc);

	test("extracts userId from profile link", () => {
		expect(detail.seller.userId).toBe("67932377");
	});

	test("sets name to null when display name is just 'Privat'", () => {
		expect(detail.seller.name).toBeNull();
	});

	test("extracts seller type as private", () => {
		expect(detail.seller.type).toBe("private");
	});

	test("extracts seller active since date", () => {
		expect(detail.seller.activeSince).toBe("12.10.2019");
	});

	test("extracts seller other ads count", () => {
		expect(detail.seller.otherAdsCount).toBe(15);
	});
});

describe("extractListingDetail – private seller (named)", () => {
	const doc = parseHTML(FIXTURE_PRIVATE_NAMED);
	const detail = extractListingDetail(doc);

	test("extracts userId from profile link", () => {
		expect(detail.seller.userId).toBe("151705867");
	});

	test("extracts seller name when private seller shows real name", () => {
		expect(detail.seller.name).toBe("Joel");
	});

	test("extracts seller type as private", () => {
		expect(detail.seller.type).toBe("private");
	});

	test("extracts seller active since date", () => {
		expect(detail.seller.activeSince).toBe("25.05.2025");
	});

	test("extracts seller other ads count", () => {
		expect(detail.seller.otherAdsCount).toBe(2);
	});
});

describe("extractListingDetail – commercial seller (bizteaser, no userId link)", () => {
	const doc = parseHTML(FIXTURE_COMMERCIAL_BIZTEASER);
	const detail = extractListingDetail(doc);

	test("extracts seller name from span when no anchor present", () => {
		expect(detail.seller.name).toBe(
			"ak Immobilien Service GmbH - Annett Kubiak",
		);
	});

	test("extracts userId from bizteaser pro slug", () => {
		expect(detail.seller.userId).toBe("pro:ak-immobilien-service-gmbh");
	});

	test("extracts seller type as commercial", () => {
		expect(detail.seller.type).toBe("commercial");
	});

	test("extracts seller active since date", () => {
		expect(detail.seller.activeSince).toBe("24.11.2017");
	});

	test("extracts other ads count from bizteaser numads", () => {
		expect(detail.seller.otherAdsCount).toBe(10);
	});
});

describe("extractListingDetail – private seller (named, no other-ads count)", () => {
	const doc = parseHTML(FIXTURE_PRIVATE_NO_OTHER_ADS);
	const detail = extractListingDetail(doc);

	test("extracts seller name", () => {
		expect(detail.seller.name).toBe("Memet Rifat Sahin");
	});

	test("extracts userId from profile link", () => {
		expect(detail.seller.userId).toBe("121671276");
	});

	test("extracts seller type as private", () => {
		expect(detail.seller.type).toBe("private");
	});

	test("extracts seller active since date", () => {
		expect(detail.seller.activeSince).toBe("15.08.2022");
	});

	test("returns null other ads count when not listed", () => {
		expect(detail.seller.otherAdsCount).toBeNull();
	});
});

describe("extractListingDetail – commercial seller (bizteaser with phone, massahaus)", () => {
	const doc = parseHTML(FIXTURE_COMMERCIAL_BIZTEASER_PHONE);
	const detail = extractListingDetail(doc);

	test("extracts seller name from span", () => {
		expect(detail.seller.name).toBe("massa haus - Norma Fitzlaff");
	});

	test("extracts userId from bizteaser pro slug", () => {
		expect(detail.seller.userId).toBe("pro:Norma-Fitzlaff-massahaus");
	});

	test("extracts seller type as commercial", () => {
		expect(detail.seller.type).toBe("commercial");
	});

	test("extracts seller active since date", () => {
		expect(detail.seller.activeSince).toBe("03.08.2022");
	});

	test("extracts other ads count from bizteaser numads", () => {
		expect(detail.seller.otherAdsCount).toBe(146);
	});
});

describe("extractListingDetail – commercial seller (bizteaser with phone, VON POLL)", () => {
	const doc = parseHTML(FIXTURE_COMMERCIAL_BIZTEASER_VONPOLL);
	const detail = extractListingDetail(doc);

	test("extracts seller name from span", () => {
		expect(detail.seller.name).toBe(
			"Berlin - Pankow - VON POLL IMMOBILIEN Shop Berlin-Pankow",
		);
	});

	test("extracts userId from bizteaser pro slug", () => {
		expect(detail.seller.userId).toBe("pro:VON-POLL-IMMOBILIEN-Berlin-Pankow");
	});

	test("extracts seller type as commercial", () => {
		expect(detail.seller.type).toBe("commercial");
	});

	test("extracts seller active since date", () => {
		expect(detail.seller.activeSince).toBe("11.09.2017");
	});

	test("extracts other ads count from bizteaser numads", () => {
		expect(detail.seller.otherAdsCount).toBe(24);
	});
});

describe("extractListingDetail – commercial seller (bizteaser VON POLL Tempelhof)", () => {
	const doc = parseHTML(FIXTURE_COMMERCIAL_BIZTEASER_VONPOLL_TEMPELHOF);
	const detail = extractListingDetail(doc);

	test("extracts seller name from span", () => {
		expect(detail.seller.name).toBe("Berlin - Tempelhof - Ayten Held");
	});

	test("extracts userId from bizteaser pro slug", () => {
		expect(detail.seller.userId).toBe(
			"pro:von-poll-immobilien-berlin-tempelhof",
		);
	});

	test("extracts seller type as commercial", () => {
		expect(detail.seller.type).toBe("commercial");
	});

	test("extracts seller active since date", () => {
		expect(detail.seller.activeSince).toBe("14.02.2024");
	});

	test("extracts other ads count from bizteaser numads", () => {
		expect(detail.seller.otherAdsCount).toBe(13);
	});
});

describe("extractListingDetail – missing fields", () => {
	const doc = parseHTML(`
		<html>
		<head></head>
		<body>
			<h1 id="viewad-title">Einfache Anzeige</h1>
			<h2 id="viewad-price">50 € VB</h2>
		</body>
		</html>
	`);
	const detail = extractListingDetail(doc);

	test("returns empty id and url when no canonical link", () => {
		expect(detail.id).toBe("");
		expect(detail.url).toBe("");
	});

	test("extracts title without hidden spans", () => {
		expect(detail.title).toBe("Einfache Anzeige");
	});

	test("falls back to parsePrice when no meta itemprop=price", () => {
		expect(detail.price).toBe("50 € VB");
		expect(detail.priceParsed).toBe(50);
	});

	test("returns null for missing optional fields", () => {
		expect(detail.location).toBeNull();
		expect(detail.date).toBeNull();
		expect(detail.category).toBeNull();
		expect(detail.latitude).toBeNull();
		expect(detail.longitude).toBeNull();
		expect(detail.viewCount).toBeNull();
	});

	test("returns empty arrays for missing images/details/features", () => {
		expect(detail.imageUrls).toEqual([]);
		expect(detail.details).toEqual({});
		expect(detail.features).toEqual([]);
	});

	test("returns null seller fields when no contact section", () => {
		expect(detail.seller.name).toBeNull();
		expect(detail.seller.userId).toBeNull();
		expect(detail.seller.type).toBeNull();
		expect(detail.seller.activeSince).toBeNull();
		expect(detail.seller.otherAdsCount).toBeNull();
	});
});
