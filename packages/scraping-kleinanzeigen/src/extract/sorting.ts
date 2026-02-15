import type { SortingOption } from "@scraper/api-types/scraper";

export interface SortingInfo {
	selected: SortingOption;
	options: { value: string; label: string }[];
}

const DEFAULT_SORT: SortingOption = "SORTING_DATE";

export function extractSorting(doc: Document): SortingInfo {
	const container = doc.querySelector(".srchresult-sorting");
	if (!container) {
		return { selected: DEFAULT_SORT, options: [] };
	}

	const hiddenInput = container.querySelector<HTMLInputElement>(
		"input[name='sortingField']",
	);
	const selected = (hiddenInput?.value ?? DEFAULT_SORT) as SortingOption;

	const optionEls = container.querySelectorAll<HTMLLIElement>(
		".textdropdown-options .selectbox-option",
	);
	const options: { value: string; label: string }[] = [];
	for (const el of Array.from(optionEls)) {
		const value = el.getAttribute("data-value");
		const label = el.textContent?.trim();
		if (value && label) {
			options.push({ value, label });
		}
	}

	return { selected, options };
}
