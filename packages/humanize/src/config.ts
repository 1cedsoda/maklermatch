export interface MouseConfig {
	/** Min/max time for full mouse movement in ms */
	moveDuration: [min: number, max: number];
	/** Number of intermediate points on the Bezier curve */
	curveSteps: [min: number, max: number];
	/** Random offset within element as fraction of element size (0-0.5) */
	targetJitter: number;
	/** Delay before click after arriving at target, in ms */
	preClickDelay: [min: number, max: number];
	/** Delay between mousedown and mouseup in ms */
	clickHoldDuration: [min: number, max: number];
}

export interface TypingConfig {
	/** Base inter-keystroke delay in ms */
	keystrokeDelay: [min: number, max: number];
	/** Probability of a longer "thinking" pause per character */
	thinkPauseProbability: number;
	/** Duration of thinking pauses in ms */
	thinkPauseDuration: [min: number, max: number];
	/** Whether to click the field before typing */
	clickBeforeTyping: boolean;
}

export interface DelayConfig {
	/** Multiplier applied to all delays (1.0 = normal, 0.5 = fast, 2.0 = slow) */
	speedFactor: number;
}

export interface ScrollConfig {
	/** Pixels per scroll step */
	scrollStep: [min: number, max: number];
	/** Delay between scroll steps in ms */
	scrollStepDelay: [min: number, max: number];
	/** Pause after a scroll burst (a "reading" pause) in ms */
	scrollPauseDuration: [min: number, max: number];
	/** Probability of pausing between scroll bursts (0-1) */
	scrollPauseProbability: number;
	/** Number of scroll steps in a burst before a potential pause */
	burstLength: [min: number, max: number];
}

export interface IdleMouseConfig {
	/** Radius in pixels of idle drift movements */
	driftRadius: [min: number, max: number];
	/** Duration of a single idle drift movement in ms */
	driftDuration: [min: number, max: number];
	/** Pause between idle movements in ms */
	driftPause: [min: number, max: number];
}

export interface BrowseConfig {
	/** Base dwell time per page in ms */
	pageDwellTime: [min: number, max: number];
	/** Fraction of page to scroll through during browsing (0-1) */
	scrollFraction: [min: number, max: number];
	/** Number of idle mouse movements during a browse action */
	idleMovements: [min: number, max: number];
}

export interface HoverConfig {
	/** Probability of hovering over an element before clicking it (0-1) */
	hoverProbability: number;
	/** Hover linger time before proceeding to click, in ms */
	hoverDuration: [min: number, max: number];
}

export interface TabSwitchConfig {
	/** Probability of simulating a tab switch when called (0-1) */
	probability: number;
	/** Duration the user is "away" looking at another tab, in ms */
	awayDuration: [min: number, max: number];
}

export interface HumanizeConfig {
	mouse: MouseConfig;
	typing: TypingConfig;
	delays: DelayConfig;
	scroll: ScrollConfig;
	idleMouse: IdleMouseConfig;
	browse: BrowseConfig;
	hover: HoverConfig;
	tabSwitch: TabSwitchConfig;
}

export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

const DEFAULTS: HumanizeConfig = {
	mouse: {
		moveDuration: [180, 600],
		curveSteps: [20, 60],
		targetJitter: 0.25,
		preClickDelay: [40, 150],
		clickHoldDuration: [50, 120],
	},
	typing: {
		keystrokeDelay: [45, 130],
		thinkPauseProbability: 0.04,
		thinkPauseDuration: [200, 600],
		clickBeforeTyping: true,
	},
	delays: {
		speedFactor: 1.0,
	},
	scroll: {
		scrollStep: [80, 200],
		scrollStepDelay: [30, 80],
		scrollPauseDuration: [500, 2000],
		scrollPauseProbability: 0.3,
		burstLength: [2, 6],
	},
	idleMouse: {
		driftRadius: [5, 40],
		driftDuration: [200, 600],
		driftPause: [300, 1200],
	},
	browse: {
		pageDwellTime: [3000, 8000],
		scrollFraction: [0.3, 0.8],
		idleMovements: [2, 6],
	},
	hover: {
		hoverProbability: 0.35,
		hoverDuration: [200, 800],
	},
	tabSwitch: {
		probability: 0.15,
		awayDuration: [2000, 15000],
	},
};

const PRESETS: Record<string, DeepPartial<HumanizeConfig>> = {
	fast: {
		mouse: {
			moveDuration: [100, 300],
			curveSteps: [15, 35],
			targetJitter: 0.2,
			preClickDelay: [20, 80],
			clickHoldDuration: [30, 80],
		},
		typing: {
			keystrokeDelay: [25, 75],
			thinkPauseProbability: 0.02,
			thinkPauseDuration: [100, 300],
		},
		delays: { speedFactor: 0.6 },
		scroll: {
			scrollStep: [100, 250],
			scrollStepDelay: [15, 40],
			scrollPauseDuration: [200, 800],
			scrollPauseProbability: 0.15,
			burstLength: [3, 8],
		},
		idleMouse: {
			driftRadius: [5, 25],
			driftDuration: [100, 300],
			driftPause: [150, 600],
		},
		browse: {
			pageDwellTime: [1500, 4000],
			scrollFraction: [0.2, 0.5],
			idleMovements: [1, 3],
		},
		hover: {
			hoverProbability: 0.15,
			hoverDuration: [100, 400],
		},
		tabSwitch: {
			probability: 0.08,
			awayDuration: [1000, 5000],
		},
	},
	cautious: {
		mouse: {
			moveDuration: [300, 900],
			curveSteps: [30, 80],
			targetJitter: 0.3,
			preClickDelay: [80, 250],
			clickHoldDuration: [70, 180],
		},
		typing: {
			keystrokeDelay: [70, 200],
			thinkPauseProbability: 0.08,
			thinkPauseDuration: [300, 1000],
		},
		delays: { speedFactor: 1.5 },
		scroll: {
			scrollStep: [60, 160],
			scrollStepDelay: [50, 120],
			scrollPauseDuration: [800, 3000],
			scrollPauseProbability: 0.5,
			burstLength: [2, 4],
		},
		idleMouse: {
			driftRadius: [8, 50],
			driftDuration: [300, 800],
			driftPause: [500, 2000],
		},
		browse: {
			pageDwellTime: [5000, 15000],
			scrollFraction: [0.4, 0.9],
			idleMovements: [3, 8],
		},
		hover: {
			hoverProbability: 0.5,
			hoverDuration: [300, 1200],
		},
		tabSwitch: {
			probability: 0.25,
			awayDuration: [3000, 20000],
		},
	},
};

export function mergeConfig(
	overrides?: DeepPartial<HumanizeConfig>,
): HumanizeConfig {
	if (!overrides) return { ...DEFAULTS };
	return {
		mouse: { ...DEFAULTS.mouse, ...overrides.mouse } as HumanizeConfig["mouse"],
		typing: {
			...DEFAULTS.typing,
			...overrides.typing,
		} as HumanizeConfig["typing"],
		delays: { ...DEFAULTS.delays, ...overrides.delays },
		scroll: {
			...DEFAULTS.scroll,
			...overrides.scroll,
		} as HumanizeConfig["scroll"],
		idleMouse: {
			...DEFAULTS.idleMouse,
			...overrides.idleMouse,
		} as HumanizeConfig["idleMouse"],
		browse: {
			...DEFAULTS.browse,
			...overrides.browse,
		} as HumanizeConfig["browse"],
		hover: { ...DEFAULTS.hover, ...overrides.hover } as HumanizeConfig["hover"],
		tabSwitch: {
			...DEFAULTS.tabSwitch,
			...overrides.tabSwitch,
		} as HumanizeConfig["tabSwitch"],
	};
}

export function createConfig(
	preset?: "fast" | "normal" | "cautious",
): HumanizeConfig {
	if (!preset || preset === "normal") return { ...DEFAULTS };
	return mergeConfig(PRESETS[preset]);
}
