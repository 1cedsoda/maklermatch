import type { Page, Locator } from "patchright";
import type { DeepPartial, HumanizeConfig } from "./config";
import { humanClick } from "./click";
import { humanFill } from "./fill";
import { humanDelay } from "./delay";
import { humanScroll } from "./scroll";
import { humanIdleMouse } from "./idle-mouse";
import { humanHover } from "./hover";
import { humanBrowse } from "./browse";
import { humanTabSwitch } from "./tab-switch";

export interface Humanizer {
	click: (page: Page, locator: Locator) => Promise<void>;
	fill: (page: Page, locator: Locator, text: string) => Promise<void>;
	delay: (page: Page, baseMs?: number) => Promise<void>;
	scroll: (page: Page, pixels?: number) => Promise<void>;
	idleMouse: (
		page: Page,
		opts?: { durationMs?: number; movements?: number },
	) => Promise<void>;
	hover: (page: Page, locator: Locator) => Promise<void>;
	browse: (page: Page) => Promise<void>;
	tabSwitch: (page: Page) => Promise<void>;
}

/** Create a bound set of humanized functions with a fixed config */
export function createHumanizer(
	config?: DeepPartial<HumanizeConfig>,
): Humanizer {
	return {
		click: (page, locator) => humanClick(page, locator, config),
		fill: (page, locator, text) => humanFill(page, locator, text, config),
		delay: (page, baseMs) => humanDelay(page, baseMs, config),
		scroll: (page, pixels) => humanScroll(page, pixels, config),
		idleMouse: (page, opts) => humanIdleMouse(page, opts, config),
		hover: (page, locator) => humanHover(page, locator, config),
		browse: (page) => humanBrowse(page, config),
		tabSwitch: (page) => humanTabSwitch(page, config),
	};
}
