import type { Page } from "patchright";

export interface SellerInfo {
	name: string | null;
	userId: string | null;
	type: "private" | "commercial" | null;
	activeSince: string | null;
	otherAdsCount: number | null;
}

export interface KleinanzeigenListingDetail {
	id: string;
	url: string;
	title: string;
	description: string;
	price: string | null;
	priceParsed: number | null;
	location: string | null;
	date: string | null;
	category: string | null;
	imageUrls: string[];
	details: Record<string, string>;
	features: string[];
	latitude: number | null;
	longitude: number | null;
	viewCount: number | null;
	seller: SellerInfo;
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

function parseCoord(value: string | null | undefined): number | null {
	if (!value) return null;
	const num = parseFloat(value);
	return isNaN(num) ? null : num;
}

export function extractListingDetail(
	doc: Document,
): KleinanzeigenListingDetail {
	const canonical = doc.querySelector('link[rel="canonical"]');
	const url = canonical?.getAttribute("href") || "";
	const idMatch = url.match(/\/(\d+)-\d+-\d+$/);
	const id = idMatch ? idMatch[1] : "";

	const titleEl = doc.querySelector("#viewad-title");
	if (titleEl) {
		for (const hidden of Array.from(titleEl.querySelectorAll(".is-hidden"))) {
			hidden.remove();
		}
	}
	const title = normalize(titleEl?.textContent) || "";

	const priceEl = doc.querySelector("#viewad-price");
	const price = normalize(priceEl?.textContent);

	const priceMeta = doc.querySelector('meta[itemprop="price"]');
	const priceContent = priceMeta?.getAttribute("content");
	const priceParsed = priceContent
		? parseFloat(priceContent)
		: parsePrice(price);

	const locationEl = doc.querySelector("#viewad-main-info #viewad-locality");
	const location = normalize(locationEl?.textContent);

	const dateEl = doc.querySelector("#viewad-extra-info span");
	const date = normalize(dateEl?.textContent);

	const categoryMeta = doc.querySelector('meta[itemprop="category"]');
	const category = categoryMeta?.getAttribute("content") || null;

	const imageEls = doc.querySelectorAll(
		".galleryimage-element img[itemprop='image']",
	);
	const imageUrls = Array.from(imageEls)
		.map((el) => el.getAttribute("src") || "")
		.filter(Boolean);

	const detailEls = doc.querySelectorAll(".addetailslist--detail");
	const details: Record<string, string> = {};
	for (const el of Array.from(detailEls)) {
		const valueEl = el.querySelector(".addetailslist--detail--value");
		const value = normalize(valueEl?.textContent);
		if (valueEl) {
			const clone = el.cloneNode(true) as Element;
			const cloneValue = clone.querySelector(".addetailslist--detail--value");
			cloneValue?.remove();
			const key = normalize(clone.textContent);
			if (key && value) {
				details[key] = value;
			}
		}
	}

	const featureEls = doc.querySelectorAll(".checktag");
	const features = Array.from(featureEls)
		.map((el) => el.textContent?.trim() || "")
		.filter(Boolean);

	const latMeta = doc.querySelector('meta[property="og:latitude"]');
	const latitude = parseCoord(latMeta?.getAttribute("content"));

	const lngMeta = doc.querySelector('meta[property="og:longitude"]');
	const longitude = parseCoord(lngMeta?.getAttribute("content"));

	const viewCountEl = doc.querySelector("#viewad-cntr-num");
	const viewCountRaw = viewCountEl?.textContent?.trim();
	const viewCount = viewCountRaw ? parseInt(viewCountRaw, 10) : null;

	const descContainer = doc.querySelector("#viewad-description .l-container");
	const description = normalize(descContainer?.textContent) || "";

	// Seller info
	const contactEl = doc.querySelector("#viewad-contact");
	const sellerNameEl = contactEl?.querySelector(".userprofile-vip a");
	const sellerName = normalize(sellerNameEl?.textContent);
	const sellerHref = sellerNameEl?.getAttribute("href") || "";
	const userIdMatch = sellerHref.match(/userId=(\d+)/);
	const userId = userIdMatch ? userIdMatch[1] : null;

	const sellerTypeEl = contactEl?.querySelector(
		".userprofile-vip-details-text",
	);
	const sellerTypeRaw = normalize(sellerTypeEl?.textContent);
	const sellerType: SellerInfo["type"] = sellerTypeRaw?.includes("Gewerblich")
		? "commercial"
		: sellerTypeRaw?.includes("Privat")
			? "private"
			: null;

	const detailTexts = contactEl?.querySelectorAll(
		".userprofile-vip-details-text",
	);
	let activeSince: string | null = null;
	for (const el of Array.from(detailTexts ?? [])) {
		const text = el.textContent?.trim() || "";
		const match = text.match(/Aktiv seit\s+(\S+)/);
		if (match) {
			activeSince = match[1];
			break;
		}
	}

	const otherAdsEl = contactEl?.querySelector("#poster-other-ads-link");
	const otherAdsRaw = otherAdsEl?.textContent?.trim() || "";
	const otherAdsMatch = otherAdsRaw.match(/(\d+)/);
	const otherAdsCount = otherAdsMatch ? parseInt(otherAdsMatch[1], 10) : null;

	return {
		id,
		url,
		title,
		description,
		price,
		priceParsed:
			priceParsed != null && !isNaN(priceParsed) ? priceParsed : null,
		location,
		date,
		category,
		imageUrls,
		details,
		features,
		latitude,
		longitude,
		viewCount,
		seller: {
			name: sellerName,
			userId,
			type: sellerType,
			activeSince,
			otherAdsCount,
		},
	};
}

export async function scrapeListingDetail(
	page: Page,
): Promise<KleinanzeigenListingDetail> {
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

		function parseC(value: string | null | undefined): number | null {
			if (!value) return null;
			const num = parseFloat(value);
			return isNaN(num) ? null : num;
		}

		const canonical = document.querySelector('link[rel="canonical"]');
		const url = canonical?.getAttribute("href") || "";
		const idMatch = url.match(/\/(\d+)-\d+-\d+$/);
		const id = idMatch ? idMatch[1] : "";

		const titleEl = document.querySelector("#viewad-title");
		if (titleEl) {
			for (const hidden of Array.from(titleEl.querySelectorAll(".is-hidden"))) {
				hidden.remove();
			}
		}
		const title = norm(titleEl?.textContent) || "";

		const priceEl = document.querySelector("#viewad-price");
		const price = norm(priceEl?.textContent);

		const priceMeta = document.querySelector('meta[itemprop="price"]');
		const priceContent = priceMeta?.getAttribute("content");
		const priceParsed = priceContent ? parseFloat(priceContent) : parseP(price);

		const locationEl = document.querySelector(
			"#viewad-main-info #viewad-locality",
		);
		const location = norm(locationEl?.textContent);

		const dateEl = document.querySelector("#viewad-extra-info span");
		const date = norm(dateEl?.textContent);

		const categoryMeta = document.querySelector('meta[itemprop="category"]');
		const category = categoryMeta?.getAttribute("content") || null;

		const imageEls = document.querySelectorAll(
			".galleryimage-element img[itemprop='image']",
		);
		const imageUrls = Array.from(imageEls)
			.map((el) => el.getAttribute("src") || "")
			.filter(Boolean);

		const detailEls = document.querySelectorAll(".addetailslist--detail");
		const details: Record<string, string> = {};
		for (const el of Array.from(detailEls)) {
			const valueEl = el.querySelector(".addetailslist--detail--value");
			const value = norm(valueEl?.textContent);
			if (valueEl) {
				const clone = el.cloneNode(true) as Element;
				const cloneValue = clone.querySelector(".addetailslist--detail--value");
				cloneValue?.remove();
				const key = norm(clone.textContent);
				if (key && value) {
					details[key] = value;
				}
			}
		}

		const featureEls = document.querySelectorAll(".checktag");
		const features = Array.from(featureEls)
			.map((el) => el.textContent?.trim() || "")
			.filter(Boolean);

		const latMeta = document.querySelector('meta[property="og:latitude"]');
		const latitude = parseC(latMeta?.getAttribute("content"));

		const lngMeta = document.querySelector('meta[property="og:longitude"]');
		const longitude = parseC(lngMeta?.getAttribute("content"));

		const viewCountEl = document.querySelector("#viewad-cntr-num");
		const viewCountRaw = viewCountEl?.textContent?.trim();
		const viewCount = viewCountRaw ? parseInt(viewCountRaw, 10) : null;

		const descContainer = document.querySelector(
			"#viewad-description .l-container",
		);
		const description = norm(descContainer?.textContent) || "";

		// Seller info
		const contactEl = document.querySelector("#viewad-contact");
		const sellerNameEl = contactEl?.querySelector(".userprofile-vip a");
		const sellerName = norm(sellerNameEl?.textContent);
		const sellerHref = sellerNameEl?.getAttribute("href") || "";
		const userIdMatch = sellerHref.match(/userId=(\d+)/);
		const userId = userIdMatch ? userIdMatch[1] : null;

		const sellerTypeEl = contactEl?.querySelector(
			".userprofile-vip-details-text",
		);
		const sellerTypeRaw = norm(sellerTypeEl?.textContent);
		const sellerType = sellerTypeRaw?.includes("Gewerblich")
			? ("commercial" as const)
			: sellerTypeRaw?.includes("Privat")
				? ("private" as const)
				: null;

		const detailTexts = contactEl?.querySelectorAll(
			".userprofile-vip-details-text",
		);
		let activeSince: string | null = null;
		for (const el of Array.from(detailTexts ?? [])) {
			const text = el.textContent?.trim() || "";
			const match = text.match(/Aktiv seit\s+(\S+)/);
			if (match) {
				activeSince = match[1];
				break;
			}
		}

		const otherAdsEl = contactEl?.querySelector("#poster-other-ads-link");
		const otherAdsRaw = otherAdsEl?.textContent?.trim() || "";
		const otherAdsMatch = otherAdsRaw.match(/(\d+)/);
		const otherAdsCount = otherAdsMatch ? parseInt(otherAdsMatch[1], 10) : null;

		return {
			id,
			url,
			title,
			description,
			price,
			priceParsed:
				priceParsed != null && !isNaN(priceParsed) ? priceParsed : null,
			location,
			date,
			category,
			imageUrls,
			details,
			features,
			latitude,
			longitude,
			viewCount,
			seller: {
				name: sellerName,
				userId,
				type: sellerType,
				activeSince,
				otherAdsCount,
			},
		};
	});
}
