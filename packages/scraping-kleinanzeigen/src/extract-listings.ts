import type { Page } from "patchright";

export interface KleinanzeigenListing {
	id: string;
	url: string;
	title: string;
	description: string;
	price: string | null;
	priceParsed: number | null;
	location: string | null;
	distance: string | null;
	date: string | null;
	imageUrl: string | null;
	imageCount: number;
	isPrivate: boolean;
	tags: string[];
	html: string;
}

function normalize(text: string | null | undefined): string | null {
	if (!text) return null;
	const cleaned = text.replace(/\s+/g, " ").trim();
	return cleaned || null;
}

function parsePrice(raw: string | null): number | null {
	if (!raw) return null;
	const digits = raw.replace(/[^\d,]/g, "").replace(",", ".");
	const num = parseFloat(digits);
	return isNaN(num) ? null : num;
}

function parseLocation(raw: string | null): {
	location: string | null;
	distance: string | null;
} {
	if (!raw) return { location: null, distance: null };
	const normalized = raw.replace(/\s+/g, " ").trim();
	const match = normalized.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
	if (match) {
		return { location: match[1].trim(), distance: match[2].trim() };
	}
	return { location: normalized, distance: null };
}

function ensureAbsoluteUrl(url: string): string {
	if (!url) return url;
	if (url.startsWith("http")) return url;
	return `https://www.kleinanzeigen.de${url.startsWith("/") ? "" : "/"}${url}`;
}

function extractArticle(article: Element): KleinanzeigenListing {
	const id = article.getAttribute("data-adid") || "";
	const url = ensureAbsoluteUrl(article.getAttribute("data-href") || "");

	const titleEl =
		article.querySelector("h2 a.ellipsis") ??
		article.querySelector("h2 span.ellipsis");
	const title = normalize(titleEl?.textContent) || "";

	const descEl = article.querySelector(".aditem-main--middle--description");
	const description = normalize(descEl?.textContent) || "";

	const priceEl = article.querySelector(
		".aditem-main--middle--price-shipping--price",
	);
	const price = normalize(priceEl?.textContent);
	const priceParsed = parsePrice(price);

	const locationEl = article.querySelector(".aditem-main--top--left");
	const { location, distance } = parseLocation(locationEl?.textContent ?? null);

	const dateEl = article.querySelector(".aditem-main--top--right");
	const date = normalize(dateEl?.textContent);

	const imgEl = article.querySelector(".imagebox img");
	const imageUrl =
		imgEl?.getAttribute("srcset") || imgEl?.getAttribute("src") || null;

	const counterEl = article.querySelector(".galleryimage--counter");
	const imageCount = parseInt(counterEl?.textContent?.trim() || "0", 10);

	const isPrivate = /von privat/i.test(article.textContent || "");

	const tagEls = article.querySelectorAll(".simpletag");
	const tags = Array.from(tagEls)
		.map((el) => el.textContent?.trim() || "")
		.filter(Boolean);

	const html = article.outerHTML;

	return {
		id,
		url,
		title,
		description,
		price,
		priceParsed,
		location,
		distance,
		date,
		imageUrl,
		imageCount,
		isPrivate,
		tags,
		html,
	};
}

export function extractListings(doc: Document): KleinanzeigenListing[] {
	const articles = doc.querySelectorAll("article.aditem");
	return Array.from(articles).map(extractArticle);
}

export async function scrapeListings(
	page: Page,
): Promise<KleinanzeigenListing[]> {
	return page.evaluate(() => {
		function norm(text: string | null | undefined): string | null {
			if (!text) return null;
			const cleaned = text.replace(/\s+/g, " ").trim();
			return cleaned || null;
		}

		function parseP(raw: string | null): number | null {
			if (!raw) return null;
			const digits = raw.replace(/[^\d,]/g, "").replace(",", ".");
			const num = parseFloat(digits);
			return isNaN(num) ? null : num;
		}

		function parseLoc(raw: string | null): {
			location: string | null;
			distance: string | null;
		} {
			if (!raw) return { location: null, distance: null };
			const normalized = raw.replace(/\s+/g, " ").trim();
			const match = normalized.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
			if (match)
				return { location: match[1].trim(), distance: match[2].trim() };
			return { location: normalized, distance: null };
		}

		function absUrl(u: string): string {
			if (!u) return u;
			if (u.startsWith("http")) return u;
			return `https://www.kleinanzeigen.de${u.startsWith("/") ? "" : "/"}${u}`;
		}

		const articles = document.querySelectorAll("article.aditem");
		return Array.from(articles).map((article) => {
			const id = article.getAttribute("data-adid") || "";
			const url = absUrl(article.getAttribute("data-href") || "");
			const titleEl =
				article.querySelector("h2 a.ellipsis") ??
				article.querySelector("h2 span.ellipsis");
			const title = norm(titleEl?.textContent) || "";
			const descEl = article.querySelector(".aditem-main--middle--description");
			const description = norm(descEl?.textContent) || "";
			const priceEl = article.querySelector(
				".aditem-main--middle--price-shipping--price",
			);
			const price = norm(priceEl?.textContent);
			const priceParsed = parseP(price);
			const locationEl = article.querySelector(".aditem-main--top--left");
			const { location, distance } = parseLoc(locationEl?.textContent ?? null);
			const dateEl = article.querySelector(".aditem-main--top--right");
			const date = norm(dateEl?.textContent);
			const imgEl = article.querySelector(".imagebox img");
			const imageUrl =
				imgEl?.getAttribute("srcset") || imgEl?.getAttribute("src") || null;
			const counterEl = article.querySelector(".galleryimage--counter");
			const imageCount = parseInt(counterEl?.textContent?.trim() || "0", 10);
			const isPrivate = /von privat/i.test(article.textContent || "");
			const tagEls = article.querySelectorAll(".simpletag");
			const tags = Array.from(tagEls)
				.map((el) => el.textContent?.trim() || "")
				.filter(Boolean);
			const html = article.outerHTML;
			return {
				id,
				url,
				title,
				description,
				price,
				priceParsed,
				location,
				distance,
				date,
				imageUrl,
				imageCount,
				isPrivate,
				tags,
				html,
			};
		});
	});
}
