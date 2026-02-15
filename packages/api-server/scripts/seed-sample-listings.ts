#!/usr/bin/env bun
/**
 * Seeds the database with sample listings from production data
 * Usage: bun run scripts/seed-sample-listings.ts
 */

import type { IngestListing } from "@scraper/api-types";
import { ingestListings } from "../src/services/ingest";
import { logger } from "../src/logger";

const log = logger.child({ module: "seed" });

const sampleListings: IngestListing[] = [
	{
		id: "3312990523",
		url: "https://www.kleinanzeigen.de/s-anzeige/charmantes-reihenendhaus-im-historischem-ortskern-von-aachen-kornelimuenster/3312990523-208-1925",
		title:
			"Charmantes Reihenendhaus im historischem Ortskern von Aachen-Kornelimünster",
		description:
			"Objektbeschreibung: Dieses gepflegte Reihenendhaus bietet ca. 100 m² Wohnfläche auf einem 82 m² großen Grundstück in zentraler Lage von Aachen-Kornelimünster. Das Haus wurde 1800 erbaut und erstreckt sich über 3 Etagen mit 4 Zimmern, davon 3 Schlafzimmer und 1 Badezimmer. Zu den Ausstattungsmerkmalen gehören eine Terrasse und eine Badewanne.",
		price: "280.000 €",
		priceParsed: 280000,
		location: "52062 Aachen-​Mitte",
		distance: null,
		date: null,
		dateParsed: null,
		imageUrl:
			"https://img.kleinanzeigen.de/api/v1/prod-ads/images/cc/ccabac23-a6e2-404a-a69f-929f66f0a9b5?rule=$_12.AUTO",
		imageCount: 6,
		isPrivate: false,
		tags: [],
		detailPage: {
			description:
				"Objektbeschreibung: Dieses gepflegte Reihenendhaus bietet ca. 100 m² Wohnfläche auf einem 82 m² großen Grundstück in zentraler Lage von Aachen-Kornelimünster.",
			category: "Häuser zum Kauf",
			imageUrls: [
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/cc/ccabac23-a6e2-404a-a69f-929f66f0a9b5?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/6c/6ce6da1c-37c7-403c-bf8a-66a89effc888?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/f2/f212e0ab-c4c1-4005-a2d0-7b3bc6885570?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/fb/fb6eb904-8992-462b-89ec-46d305688943?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/a5/a52e30b5-4484-4fe7-a54b-793bddfbfe6b?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/0c/0c601ea6-c096-442f-b356-7eac3ebf76d3?rule=$_59.AUTO",
			],
			details: {
				Wohnfläche: "100 m²",
				Zimmer: "4",
				Schlafzimmer: "3",
				Badezimmer: "1",
				Grundstücksfläche: "82 m²",
				Haustyp: "Einfamilienhaus freistehend",
				Etagen: "3",
				Baujahr: "1800",
				Provision: "Mit Provision",
			},
			features: ["Terrasse", "Badewanne"],
			latitude: null,
			longitude: null,
			viewCount: null,
			seller: {
				userId: "lbs-phillipp-lennartz",
				name: "LBS Gebietsleitung - Phillipp Lennartz",
				type: "commercial",
				activeSince: "26.01.2018",
				otherAdsCount: 9,
			},
		},
	},
	{
		id: "3277253068",
		url: "https://www.kleinanzeigen.de/s-anzeige/ihr-neues-zuhause-wartet-neubau-bungalow-in-bester-lage/3277253068-208-2272",
		title: "Ihr neues Zuhause wartet - Neubau-Bungalow in bester Lage",
		description:
			"Objektbeschreibung: Träumen Sie noch - oder wohnen Sie schon? Ihr neues Zuhause wartet! Ich bin Ihr Ansprechpartner für ein massa-Haus in Ihrer Region. Dieser moderne Bungalow bietet 118 m² Wohnfläche mit 4 Zimmern, 3 Schlafzimmern und 2 Badezimmern auf einem 750 m² großen Grundstück.",
		price: "466.000 €",
		priceParsed: 466000,
		location: "06749 Bitterfeld",
		distance: null,
		date: null,
		dateParsed: null,
		imageUrl:
			"https://img.kleinanzeigen.de/api/v1/prod-ads/images/f0/f08456fa-b4d5-48ef-aad9-b7f569777079?rule=$_12.AUTO",
		imageCount: 11,
		isPrivate: false,
		tags: [],
		detailPage: {
			description:
				"Objektbeschreibung: Träumen Sie noch - oder wohnen Sie schon? Ihr neues Zuhause wartet! Ich bin Ihr Ansprechpartner für ein massa-Haus in Ihrer Region.",
			category: "Häuser zum Kauf",
			imageUrls: [
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/f0/f08456fa-b4d5-48ef-aad9-b7f569777079?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/9d/9db0fda7-4037-4e34-8d08-e96c87bebf43?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/4d/4d18e1ff-c038-42c9-8f99-eaeec263daab?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/58/58cc9f81-e722-43d0-ae56-a3812873557d?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/30/30f4cca1-d585-4d3a-89ff-ae83baa015e3?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/50/500a324e-0734-4818-a55f-5966618adb20?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/65/652ddd8f-3b37-4380-9e73-fa62dc2b29cb?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/16/161d6d53-73c4-4257-a03c-de43abb1d537?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/d2/d2ae85cb-3017-46b2-b9bd-bd468066d25e?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/90/90bc905f-baa0-4023-9ada-1c19b0159081?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/6b/6bf551d1-b311-4a47-9b2d-3a533dace649?rule=$_59.AUTO",
			],
			details: {
				Wohnfläche: "118 m²",
				Zimmer: "4",
				Schlafzimmer: "3",
				Badezimmer: "2",
				Grundstücksfläche: "750 m²",
				Haustyp: "Bungalow",
				Etagen: "1",
				Provision: "Keine zusätzliche Käuferprovision",
			},
			features: [],
			latitude: null,
			longitude: null,
			viewCount: null,
			seller: {
				userId: "massa-haus-elena-hoffmann",
				name: "massa haus - Elena Hoffmann",
				type: "commercial",
				activeSince: "20.11.2025",
				otherAdsCount: 124,
			},
		},
	},
	{
		id: "3277173339",
		url: "https://www.kleinanzeigen.de/s-anzeige/wohn-und-geschaeftshaus-lagerflaeche-ladenlokal-wohnung-modernisiert-54536-kroev/3277173339-208-5271",
		title:
			"Wohn- und Geschäftshaus | Lagerfläche | Ladenlokal | Wohnung modernisiert | 54536 Kröv",
		description:
			"Objektbeschreibung: Willkommen in Ihrem neuen Zuhause an der bezaubernden Mosel! Dieses charmante Wohn- und Geschäftshaus vereint Wohnkomfort mit geschäftlichen Möglichkeiten. Mit 171,26 m² Wohnfläche, 5 Zimmern, 4 Schlafzimmern und 2 Badezimmern auf einem 468 m² großen Grundstück bietet es vielfältige Nutzungsmöglichkeiten.",
		price: "369.000 €",
		priceParsed: 369000,
		location: "54536 Kröv",
		distance: null,
		date: null,
		dateParsed: null,
		imageUrl:
			"https://img.kleinanzeigen.de/api/v1/prod-ads/images/7c/7c11655f-bd40-4c84-809b-e026b5c0fade?rule=$_12.AUTO",
		imageCount: 21,
		isPrivate: false,
		tags: [],
		detailPage: {
			description:
				"Objektbeschreibung: Willkommen in Ihrem neuen Zuhause an der bezaubernden Mosel! Dieses charmante Wohn- und Geschäftshaus vereint Wohnkomfort mit geschäftlichen Möglichkeiten.",
			category: "Häuser zum Kauf",
			imageUrls: [
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/7c/7c11655f-bd40-4c84-809b-e026b5c0fade?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/5a/5a476ec8-4abe-4c79-a755-6d10baae45bc?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/4c/4c38cbda-0287-43a5-a7ce-ba56fc1acfdd?rule=$_59.AUTO",
			],
			details: {
				Wohnfläche: "171,26 m²",
				Zimmer: "5",
				Schlafzimmer: "4",
				Badezimmer: "2",
				Grundstücksfläche: "468 m²",
				Etagen: "2",
				Baujahr: "1977",
				Provision: "Mit Provision",
			},
			features: [
				"Balkon",
				"Gäste-WC",
				"Fußbodenheizung",
				"Keller",
				"Garage/Stellplatz",
			],
			latitude: null,
			longitude: null,
			viewCount: null,
			seller: {
				userId: "mh-immoconcept-tanja-justen",
				name: "MH ImmoConcept - Tanja Justen",
				type: "commercial",
				activeSince: "18.01.2023",
				otherAdsCount: 36,
			},
		},
	},
	{
		id: "3300070460",
		url: "https://www.kleinanzeigen.de/s-anzeige/geniessen-sie-diese-ferienoase-zwischen-den-seen/3300070460-208-19105",
		title: "Genießen Sie diese Ferienoase zwischen den Seen",
		description:
			"Objektbeschreibung: Zum Verkauf steht ein gepflegtes Ferienhaus in bevorzugter Lage zwischen den Seen. Mit 45 m² Wohnfläche, 2 Zimmern, 1 Schlafzimmer und 1 Badezimmer auf einem 208 m² großen Grundstück ist dieses gemütliche Ferienhaus die perfekte Rückzugsoase.",
		price: "85.000 €",
		priceParsed: 85000,
		location: "16866 Kyritz",
		distance: null,
		date: null,
		dateParsed: null,
		imageUrl:
			"https://img.kleinanzeigen.de/api/v1/prod-ads/images/02/02d17c74-3103-4756-8ad3-45ca331fc049?rule=$_12.AUTO",
		imageCount: 12,
		isPrivate: false,
		tags: [],
		detailPage: {
			description:
				"Objektbeschreibung: Zum Verkauf steht ein gepflegtes Ferienhaus in bevorzugter Lage zwischen den Seen.",
			category: "Häuser zum Kauf",
			imageUrls: [
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/02/02d17c74-3103-4756-8ad3-45ca331fc049?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/1e/1e357aa5-458c-4780-806e-44e35381cf98?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/c7/c7a633b5-75b9-44f2-9f07-41d34f0de7a0?rule=$_59.AUTO",
			],
			details: {
				Wohnfläche: "45 m²",
				Zimmer: "2",
				Schlafzimmer: "1",
				Badezimmer: "1",
				Grundstücksfläche: "208 m²",
				Haustyp: "Andere Haustypen",
				Etagen: "1",
				Baujahr: "1986",
				Provision: "Mit Provision",
			},
			features: ["Terrasse", "Garage/Stellplatz"],
			latitude: null,
			longitude: null,
			viewCount: null,
			seller: {
				userId: "neubrandenburg-richard-schroeder",
				name: "Neubrandenburg - Richard Schröder",
				type: "commercial",
				activeSince: "17.07.2025",
				otherAdsCount: 10,
			},
		},
	},
	{
		id: "3313168597",
		url: "https://www.kleinanzeigen.de/s-anzeige/neubau-grosses-doppelhaus-auf-grossem-grundstueck/3313168597-208-8409",
		title: "Neubau - Großes Doppelhaus auf großem Grundstück",
		description:
			"Objektbeschreibung: Bauen Sie dieses große Doppel-Haus mit Freunden oder Verwandten und sparen Sie Baukosten! Mit 200 m² Wohnfläche, 10 Zimmern, 6 Schlafzimmern und 2 Badezimmern auf einem 616 m² großen Grundstück bietet dieses Mehrfamilienhaus viel Platz für zwei Familien.",
		price: "819.000 €",
		priceParsed: 819000,
		location: "71739 Oberriexingen",
		distance: null,
		date: null,
		dateParsed: null,
		imageUrl:
			"https://img.kleinanzeigen.de/api/v1/prod-ads/images/e5/e52b7b96-68e9-4278-a286-ea9f006bdc6e?rule=$_12.AUTO",
		imageCount: 13,
		isPrivate: false,
		tags: [],
		detailPage: {
			description:
				"Objektbeschreibung: Bauen Sie dieses große Doppel-Haus mit Freunden oder Verwandten und sparen Sie Baukosten!",
			category: "Häuser zum Kauf",
			imageUrls: [
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/e5/e52b7b96-68e9-4278-a286-ea9f006bdc6e?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/76/769d9455-4da7-46ae-83bd-4b118a9136ee?rule=$_59.AUTO",
			],
			details: {
				Wohnfläche: "200 m²",
				Zimmer: "10",
				Schlafzimmer: "6",
				Badezimmer: "2",
				Grundstücksfläche: "616 m²",
				Haustyp: "Mehrfamilienhaus",
				Etagen: "2",
				Provision: "Keine zusätzliche Käuferprovision",
			},
			features: ["Gäste-WC", "Fußbodenheizung"],
			latitude: null,
			longitude: null,
			viewCount: null,
			seller: {
				userId: "massa-haus-daniel-stumpp",
				name: "massa haus - Daniel Stumpp",
				type: "commercial",
				activeSince: "28.02.2025",
				otherAdsCount: 147,
			},
		},
	},
	{
		id: "3265161482",
		url: "https://www.kleinanzeigen.de/s-anzeige/neubau-in-zweiter-reihe-zum-winteraktionspreis/3265161482-208-9470",
		title: "Neubau in zweiter Reihe zum Winteraktionspreis",
		description:
			"Objektbeschreibung: Zeitlose Eleganz von außen, großzügiger Raum und ein besonderes Raumgefühl von innen. Dieses freistehende Einfamilienhaus mit 135 m² Wohnfläche, 5 Zimmern, 3 Schlafzimmern und 1 Badezimmer auf einem 500 m² großen Grundstück bietet modernen Wohnkomfort.",
		price: "682.900 €",
		priceParsed: 682900,
		location: "22395 Hamburg Bergstedt",
		distance: null,
		date: null,
		dateParsed: null,
		imageUrl:
			"https://img.kleinanzeigen.de/api/v1/prod-ads/images/78/78a81be6-38d8-464f-8935-dc0c2656f625?rule=$_12.AUTO",
		imageCount: 8,
		isPrivate: false,
		tags: [],
		detailPage: {
			description:
				"Objektbeschreibung: Zeitlose Eleganz von außen, großzügiger Raum und ein besonderes Raumgefühl von innen.",
			category: "Häuser zum Kauf",
			imageUrls: [
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/78/78a81be6-38d8-464f-8935-dc0c2656f625?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/0d/0dff39d8-92cb-4b96-b546-1b6bbf1a175e?rule=$_59.AUTO",
			],
			details: {
				Wohnfläche: "135 m²",
				Zimmer: "5",
				Schlafzimmer: "3",
				Badezimmer: "1",
				Grundstücksfläche: "500 m²",
				Haustyp: "Einfamilienhaus freistehend",
				Etagen: "2",
				Provision: "Keine zusätzliche Käuferprovision",
			},
			features: ["Gäste-WC"],
			latitude: null,
			longitude: null,
			viewCount: null,
			seller: {
				userId: "okal-haus-sandra-liebenwald",
				name: "OKAL Haus GmbH - Team Nord - Sandra Liebenwald",
				type: "commercial",
				activeSince: "03.11.2022",
				otherAdsCount: 1027,
			},
		},
	},
	{
		id: "3277307135",
		url: "https://www.kleinanzeigen.de/s-anzeige/modern-nachhaltig-ressourcenschonend-wie-wuenschen-sie-sich-ihr-mehrgenerationenhaus-/3277307135-208-9120",
		title:
			"modern, nachhaltig, ressourcenschonend, wie wünschen Sie sich Ihr Mehrgenerationenhaus?",
		description:
			"Objektbeschreibung: Ein Haus mit mehreren Wohn-Optionen Das FamilyStyle 26.01 S bietet auf einer Gesamtwohnfläche von 264 m², 8 Zimmern, 5 Schlafzimmern und 3 Badezimmern auf einem 627 m² großen Grundstück verschiedene Wohnoptionen für mehrere Generationen unter einem Dach.",
		price: "587.469 €",
		priceParsed: 587469,
		location: "72362 Nusplingen",
		distance: null,
		date: null,
		dateParsed: null,
		imageUrl:
			"https://img.kleinanzeigen.de/api/v1/prod-ads/images/dd/dd7ca91a-1dba-4ae1-8bd7-91b553ee9466?rule=$_12.AUTO",
		imageCount: 13,
		isPrivate: false,
		tags: [],
		detailPage: {
			description:
				"Objektbeschreibung: Ein Haus mit mehreren Wohn-Optionen Das FamilyStyle 26.01 S bietet verschiedene Wohnoptionen für mehrere Generationen unter einem Dach.",
			category: "Häuser zum Kauf",
			imageUrls: [
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/dd/dd7ca91a-1dba-4ae1-8bd7-91b553ee9466?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/9d/9d336c22-919f-45a0-a0d3-3e5cf026ac4c?rule=$_59.AUTO",
			],
			details: {
				Wohnfläche: "264 m²",
				Zimmer: "8",
				Schlafzimmer: "5",
				Badezimmer: "3",
				Grundstücksfläche: "627 m²",
				Haustyp: "Andere Haustypen",
				Provision: "Keine zusätzliche Käuferprovision",
			},
			features: ["Gäste-WC"],
			latitude: null,
			longitude: null,
			viewCount: null,
			seller: {
				userId: "massa-haus-markus-heinze",
				name: "massa haus GmbH - Markus Heinze",
				type: "commercial",
				activeSince: "26.02.2025",
				otherAdsCount: 371,
			},
		},
	},
	{
		id: "3312742990",
		url: "https://www.kleinanzeigen.de/s-anzeige/-jetzt-raus-aus-der-miete-bauen-sie-ihr-individuelles-wohnparadies-/3312742990-208-8428",
		title:
			"! Jetzt raus aus der Miete ! Bauen Sie Ihr individuelles Wohnparadies !",
		description:
			"Objektbeschreibung: Moderne Architektur für individuelles Wohnen - Das Einfamilienhaus LifeStyle 13.01 S überzeugt mit zeitgemäßer Architektur. Mit 125 m² Wohnfläche, 5 Zimmern auf einem 570 m² großen Grundstück bietet es modernen Wohnkomfort mit Gäste-WC, Fußbodenheizung im Neubau.",
		price: "557.149 €",
		priceParsed: 557149,
		location: "75417 Mühlacker",
		distance: null,
		date: null,
		dateParsed: null,
		imageUrl:
			"https://img.kleinanzeigen.de/api/v1/prod-ads/images/2f/2f2007c3-5601-41d1-a0ca-9a3bab6fbe3a?rule=$_12.AUTO",
		imageCount: 9,
		isPrivate: false,
		tags: [],
		detailPage: {
			description:
				"Objektbeschreibung: Moderne Architektur für individuelles Wohnen - Das Einfamilienhaus LifeStyle 13.01 S überzeugt mit zeitgemäßer Architektur.",
			category: "Häuser zum Kauf",
			imageUrls: [
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/2f/2f2007c3-5601-41d1-a0ca-9a3bab6fbe3a?rule=$_59.AUTO",
				"https://img.kleinanzeigen.de/api/v1/prod-ads/images/fc/fccac093-45d2-453c-be97-e7130996dad4?rule=$_59.AUTO",
			],
			details: {
				Wohnfläche: "125 m²",
				Zimmer: "5",
				Grundstücksfläche: "570 m²",
				Haustyp: "Einfamilienhaus freistehend",
				Provision: "Keine zusätzliche Käuferprovision",
			},
			features: ["Gäste-WC", "Fußbodenheizung", "Neubau"],
			latitude: null,
			longitude: null,
			viewCount: null,
			seller: {
				userId: "massa-haus-angela-stumpp",
				name: "massa haus - Angela Stumpp",
				type: "commercial",
				activeSince: "26.02.2025",
				otherAdsCount: 323,
			},
		},
	},
];

async function main() {
	log.info("Starting sample listings seed...");

	const result = ingestListings("Berlin", sampleListings, null);

	log.info(
		{
			new: result.newCount,
			updated: result.updatedCount,
			versions: result.versionCount,
			detailSnapshots: result.detailSnapshotCount,
		},
		"Sample listings seeded successfully",
	);

	console.log("\n✅ Seed completed!");
	console.log(`   New listings: ${result.newCount}`);
	console.log(`   Updated listings: ${result.updatedCount}`);
	console.log(`   Abstract versions: ${result.versionCount}`);
	console.log(`   Detail snapshots: ${result.detailSnapshotCount}`);
}

main().catch((err) => {
	log.error({ err }, "Failed to seed sample listings");
	process.exit(1);
});
