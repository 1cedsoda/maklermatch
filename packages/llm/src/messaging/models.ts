export enum Tone {
	DU = "du",
	SIE = "sie",
}

export enum SellerEmotion {
	PROUD = "proud",
	URGENT = "urgent",
	NEUTRAL = "neutral",
	RELUCTANT = "reluctant",
}

export enum DescriptionEffort {
	HIGH = "high",
	MEDIUM = "medium",
	LOW = "low",
}

export enum PriceAssessment {
	BELOW_MARKET = "below_market",
	AT_MARKET = "at_market",
	ABOVE_MARKET = "above_market",
	UNKNOWN = "unknown",
}

export enum FollowUpStage {
	INITIAL = 0,
	FOLLOWUP_1 = 1,
	FOLLOWUP_2 = 2,
	DONE = 3,
}

export interface ListingSignals {
	rawText: string;
	listingId: string;
	listingUrl: string;

	propertyType: string;
	title: string;

	price: number;
	pricePerSqm: number;
	isVb: boolean;
	priceAssessment: PriceAssessment;
	provision: string;

	wohnflaeche: number;
	grundstueck: number;
	zimmer: number;
	baujahr: number;
	etagen: number;

	plz: string;
	city: string;
	bundesland: string;
	neighborhood: string;

	uniqueFeatures: string[];
	renovationHistory: string;
	lifestyleSignals: string[];
	infrastructure: string[];
	locationQualityHints: string[];
	amenities: string[];

	sellerName: string;
	sellerEmotion: SellerEmotion;
	descriptionEffort: DescriptionEffort;
	tone: Tone;
	hasProvisionNote: boolean;
	listingAgeDays: number;
}

export function createListingSignals(
	rawText: string,
	listingId = "",
	listingUrl = "",
): ListingSignals {
	return {
		rawText,
		listingId,
		listingUrl,
		propertyType: "",
		title: "",
		price: 0,
		pricePerSqm: 0,
		isVb: false,
		priceAssessment: PriceAssessment.UNKNOWN,
		provision: "",
		wohnflaeche: 0,
		grundstueck: 0,
		zimmer: 0,
		baujahr: 0,
		etagen: 0,
		plz: "",
		city: "",
		bundesland: "",
		neighborhood: "",
		uniqueFeatures: [],
		renovationHistory: "",
		lifestyleSignals: [],
		infrastructure: [],
		locationQualityHints: [],
		amenities: [],
		sellerName: "",
		sellerEmotion: SellerEmotion.NEUTRAL,
		descriptionEffort: DescriptionEffort.MEDIUM,
		tone: Tone.SIE,
		hasProvisionNote: false,
		listingAgeDays: 0,
	};
}

// --- Pre-Screening Gate ---

export type GateRejectionType = "kriterien_mismatch" | "llm_rejection";

export interface GateResult {
	passed: boolean;
	rejectionType: GateRejectionType | null;
	rejectionReason: string | null;
	details: string[];
}

export interface BrokerCriteria {
	minPrice?: number;
	maxPrice?: number;
	propertyTypes?: string[];
	plzPrefixes?: string[];
	cities?: string[];
	bundeslaender?: string[];
	minWohnflaeche?: number;
	maxWohnflaeche?: number;
	minZimmer?: number;
}

export interface PersonalizationResult {
	primaryAnchor: string;
	secondaryAnchors: string[];
	tone: Tone;
	priceInsight: string | null;
	emotionalHook: string | null;
}

export interface Message {
	text: string;
	listingId: string;
	listingUrl: string;
	generatedAt: Date;
	spamGuardScore: number;
	generationAttempt: number;
	stage: FollowUpStage;
	previousMessageId: string | null;
}

export function createMessage(
	text: string,
	listingId: string,
	opts: Partial<
		Pick<
			Message,
			| "listingUrl"
			| "spamGuardScore"
			| "generationAttempt"
			| "stage"
			| "previousMessageId"
		>
	> = {},
): Message {
	return {
		text,
		listingId,
		listingUrl: opts.listingUrl ?? "",
		generatedAt: new Date(),
		spamGuardScore: opts.spamGuardScore ?? 0,
		generationAttempt: opts.generationAttempt ?? 1,
		stage: opts.stage ?? FollowUpStage.INITIAL,
		previousMessageId: opts.previousMessageId ?? null,
	};
}

export interface ConversationState {
	listingId: string;
	listingUrl: string;
	sellerId: string;
	messagesSent: Message[];
	currentStage: FollowUpStage;
	firstContactAt: Date | null;
	lastMessageAt: Date | null;
	nextFollowupAt: Date | null;
	replyReceived: boolean;
	replyAt: Date | null;
	conversationActive: boolean;
	listingStillActive: boolean;
}

export function createConversationState(
	listingId: string,
	listingUrl: string,
	sellerId = "",
): ConversationState {
	return {
		listingId,
		listingUrl,
		sellerId,
		messagesSent: [],
		currentStage: FollowUpStage.INITIAL,
		firstContactAt: null,
		lastMessageAt: null,
		nextFollowupAt: null,
		replyReceived: false,
		replyAt: null,
		conversationActive: true,
		listingStillActive: true,
	};
}

export function shouldStop(state: ConversationState): boolean {
	if (!state.conversationActive) return true;
	if (!state.listingStillActive) return true;
	if (state.currentStage === FollowUpStage.DONE) return true;
	return false;
}
