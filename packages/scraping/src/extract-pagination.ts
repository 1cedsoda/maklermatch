export interface Pagination {
	currentPage: number;
	totalPages: number;
	nextUrl: string | null;
	prevUrl: string | null;
}

export function extractPagination(doc: Document): Pagination {
	const container = doc.querySelector(".pagination");
	if (!container) {
		return { currentPage: 1, totalPages: 1, nextUrl: null, prevUrl: null };
	}

	const currentEl = container.querySelector(".pagination-current");
	const currentPage = parseInt(currentEl?.textContent?.trim() || "1", 10);

	const pageEls = container.querySelectorAll(".pagination-pages > *");
	let totalPages = currentPage;
	for (const el of Array.from(pageEls)) {
		const text = el.textContent?.trim();
		if (!text || text === "...") continue;
		const num = parseInt(text, 10);
		if (!isNaN(num) && num > totalPages) totalPages = num;
	}

	const prevEl =
		container.querySelector<HTMLAnchorElement>("a.pagination-prev");
	const prevUrl = prevEl?.getAttribute("href") || null;

	const nextEl =
		container.querySelector<HTMLAnchorElement>("a.pagination-next");
	const nextUrl = nextEl?.getAttribute("href") || null;

	return { currentPage, totalPages, nextUrl, prevUrl };
}
