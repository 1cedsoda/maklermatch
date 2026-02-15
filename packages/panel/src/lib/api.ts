import type {
	LoginRequest,
	LoginResponse,
	ListingsResponse,
	ListingWithVersions,
	ScrapingTasksResponse,
	ScrapingTaskDetailResponse,
	TargetsResponse,
	SearchTarget,
	CreateTargetRequest,
	UpdateTargetRequest,
	SchedulerStatusResponse,
	SellersResponse,
	SellerWithSnapshots,
} from "@scraper/api-types";

export interface BrokerRow {
	id: number;
	companyId: number | null;
	companyName: string | null;
	name: string;
	phone: string | null;
	email: string;
	bio: string | null;
	active: boolean;
	createdAt: string;
}

export interface BrokerInput {
	name: string;
	companyId?: number | null;
	phone?: string;
	email: string;
	bio?: string;
}

export interface CompanyRow {
	id: number;
	name: string;
	email: string | null;
	description: string | null;
	billingStreet: string | null;
	billingStreet2: string | null;
	billingCity: string | null;
	billingZipCode: string | null;
	billingCountry: string | null;
	ustId: string | null;
	iban: string | null;
	bic: string | null;
	bankName: string | null;
	minPrice: number | null;
	maxPrice: number | null;
	active: boolean;
	createdAt: string;
	brokerCount?: number;
}

export interface CompanyInput {
	name: string;
	email?: string;
	description?: string;
	billingStreet?: string;
	billingStreet2?: string;
	billingCity?: string;
	billingZipCode?: string;
	billingCountry?: string;
	ustId?: string;
	iban?: string;
	bic?: string;
	bankName?: string;
	minPrice?: number | null;
	maxPrice?: number | null;
}

// --- Zip Code Groups ---

export interface ZipCodeGroupBroker {
	id: number;
	brokerId: number;
	brokerName: string | null;
}

export interface ZipCodeGroupRow {
	id: number;
	companyId: number;
	zipCodes: string[];
	brokers: ZipCodeGroupBroker[];
	active: boolean;
	createdAt: string;
}

// --- Conversations ---

export interface ConversationRow {
	id: number;
	listingId: string;
	listingTitle: string | null;
	brokerId: string;
	brokerEmail: string;
	sellerName: string | null;
	status: "active" | "reply_received" | "stopped" | "done";
	currentStage: string;
	lastMessageAt: string | null;
	createdAt: string;
}

export interface ConversationMessageRow {
	id: number;
	conversationId: number;
	direction: "outbound" | "inbound";
	channel: "browser" | "email";
	body: string;
	stage: string | null;
	spamGuardScore: number | null;
	sentAt: string;
}

export interface ConversationDetail extends ConversationRow {
	messages: ConversationMessageRow[];
	emails: unknown[];
	broker: BrokerRow | null;
	listing: {
		title: string;
		description: string;
		price: string | null;
		location: string | null;
		url: string;
	} | null;
}

interface ActiveTask {
	id: number;
	targetId: number;
	targetName: string;
	targetLocation: string;
}

export interface ScraperStatusResponse {
	isRunning: boolean;
	runningTaskCount?: number;
	maxConcurrency?: number;
	lastRunAt: string | null;
	memoryMb?: {
		rss: number;
		heapUsed: number;
		heapTotal: number;
	};
	currentTask: ActiveTask | null;
	activeTasks?: ActiveTask[];
	scrapers: {
		id: string;
		name: string;
		source: string;
		cities: string[];
	}[];
}

export interface AnalyticsResponse {
	timeRange: {
		days: number;
		startDate: string;
		endDate: string;
	};
	scraping: {
		totalListings: number;
		activeListings: number;
		removedListings: number;
		newListingsInPeriod: number;
		scrapingTasksInPeriod: number;
		successfulTasks: number;
		failedTasks: number;
		successRate: string;
	};
	conversations: {
		total: number;
		inPeriod: number;
		byStatus: Array<{ status: string; count: number }>;
		byStage: Array<{ stage: string; count: number }>;
		withReplies: number;
		responseRate: string;
	};
	messages: {
		totalOutbound: number;
		sentInPeriod: number;
		receivedInPeriod: number;
	};
	leads: {
		listingsWithConversations: number;
		listingsWithoutConversations: number;
		activeListingsWithConversations: number;
		conversionRate: string;
	};
	charts: {
		dailyActivity: Array<{
			date: string;
			outbound: number;
			inbound: number;
		}>;
		dailyScraping: Array<{
			date: string;
			tasks: number;
			success: number;
			error: number;
			listingsFound: number;
		}>;
		topTargets: Array<{
			targetId: number;
			targetName: string;
			totalListings: number;
			taskCount: number;
		}>;
	};
}

class PanelApiClient {
	private getToken(): string | null {
		return localStorage.getItem("token");
	}

	private async request<T>(
		method: string,
		path: string,
		body?: unknown,
	): Promise<T> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};
		const token = this.getToken();
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}

		const res = await fetch(path, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		});

		if (res.status === 401) {
			localStorage.removeItem("token");
			window.location.href = "/login";
			throw new Error("Unauthorized");
		}

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`${method} ${path}: ${res.status} ${text}`);
		}

		return res.json();
	}

	login(data: LoginRequest): Promise<LoginResponse> {
		return this.request("POST", "/api/auth/login", data);
	}

	getListings(page = 1, limit = 20): Promise<ListingsResponse> {
		return this.request("GET", `/api/listings?page=${page}&limit=${limit}`);
	}

	getListing(id: string): Promise<ListingWithVersions> {
		return this.request("GET", `/api/listings/${id}`);
	}

	getScrapingTasks(opts?: {
		targetId?: number;
		limit?: number;
	}): Promise<ScrapingTasksResponse> {
		const params = new URLSearchParams();
		if (opts?.targetId) params.set("targetId", String(opts.targetId));
		if (opts?.limit) params.set("limit", String(opts.limit));
		const qs = params.toString();
		return this.request("GET", `/api/scraping-tasks${qs ? `?${qs}` : ""}`);
	}

	getSchedulerStatus(): Promise<SchedulerStatusResponse> {
		return this.request("GET", "/api/targets/scheduler-status");
	}

	getScraperStatus(): Promise<ScraperStatusResponse> {
		return this.request("GET", "/api/scraper/status");
	}

	startScrape(
		targetId: number,
		opts?: { headless?: boolean },
	): Promise<{ message: string }> {
		return this.request("POST", "/api/scraper/start", {
			targetId,
			...opts,
		});
	}

	cancelTask(taskId: number): Promise<{ ok: true } | { error: string }> {
		return this.request("POST", "/api/scraper/cancel", { taskId });
	}

	getTargets(): Promise<TargetsResponse> {
		return this.request("GET", "/api/targets");
	}

	getTarget(id: number): Promise<SearchTarget> {
		return this.request("GET", `/api/targets/${id}`);
	}

	createTarget(data: CreateTargetRequest): Promise<SearchTarget> {
		return this.request("POST", "/api/targets", data);
	}

	updateTarget(id: number, data: UpdateTargetRequest): Promise<SearchTarget> {
		return this.request("PATCH", `/api/targets/${id}`, data);
	}

	async deleteTarget(id: number): Promise<void> {
		await this.request("DELETE", `/api/targets/${id}`);
	}

	getScrapingTask(id: number): Promise<ScrapingTaskDetailResponse> {
		return this.request("GET", `/api/scraping-tasks/${id}`);
	}

	getScraperLogs(
		scraperId: string,
	): Promise<{ scraperId: string; lines: { line: string; ts: number }[] }> {
		return this.request("GET", `/api/scraper/logs?scraperId=${scraperId}`);
	}

	getSellers(page = 1, limit = 20): Promise<SellersResponse> {
		return this.request("GET", `/api/sellers?page=${page}&limit=${limit}`);
	}

	getSeller(id: number): Promise<SellerWithSnapshots> {
		return this.request("GET", `/api/sellers/${id}`);
	}

	// --- Brokers ---

	getBrokers(): Promise<BrokerRow[]> {
		return this.request("GET", "/api/brokers");
	}

	getBroker(id: number): Promise<BrokerRow> {
		return this.request("GET", `/api/brokers/${id}`);
	}

	createBroker(data: BrokerInput): Promise<BrokerRow> {
		return this.request("POST", "/api/brokers", data);
	}

	updateBroker(id: number, data: Partial<BrokerInput>): Promise<BrokerRow> {
		return this.request("PUT", `/api/brokers/${id}`, data);
	}

	async deleteBroker(id: number): Promise<void> {
		await this.request("DELETE", `/api/brokers/${id}`);
	}

	// --- Companies ---

	getCompanies(): Promise<CompanyRow[]> {
		return this.request("GET", "/api/companies");
	}

	getCompany(id: number): Promise<CompanyRow & { brokers: BrokerRow[] }> {
		return this.request("GET", `/api/companies/${id}`);
	}

	createCompany(data: CompanyInput): Promise<CompanyRow> {
		return this.request("POST", "/api/companies", data);
	}

	updateCompany(id: number, data: Partial<CompanyInput>): Promise<CompanyRow> {
		return this.request("PUT", `/api/companies/${id}`, data);
	}

	async deleteCompany(id: number): Promise<void> {
		await this.request("DELETE", `/api/companies/${id}`);
	}

	// --- Zip Code Groups ---

	getZipCodeGroups(companyId: number): Promise<ZipCodeGroupRow[]> {
		return this.request("GET", `/api/companies/${companyId}/plz`);
	}

	createZipCodeGroup(
		companyId: number,
		data: { zipCodes: string[]; brokerIds?: number[] },
	): Promise<ZipCodeGroupRow> {
		return this.request("POST", `/api/companies/${companyId}/plz`, data);
	}

	updateZipCodeGroup(
		companyId: number,
		id: number,
		data: { zipCodes?: string[]; brokerIds?: number[] },
	): Promise<ZipCodeGroupRow> {
		return this.request("PUT", `/api/companies/${companyId}/plz/${id}`, data);
	}

	async deleteZipCodeGroup(companyId: number, id: number): Promise<void> {
		await this.request("DELETE", `/api/companies/${companyId}/plz/${id}`);
	}

	// --- Conversations ---

	createConversation(data: {
		listingId: string;
		brokerId: number;
		brokerEmail: string;
		sellerName?: string;
	}): Promise<ConversationRow> {
		return this.request("POST", "/api/conversations", data);
	}

	getConversations(): Promise<ConversationRow[]> {
		return this.request("GET", "/api/conversations");
	}

	getConversation(id: number): Promise<ConversationDetail> {
		return this.request("GET", `/api/conversations/${id}`);
	}

	saveConversationMessage(
		conversationId: number,
		data: { direction: "outbound" | "inbound"; body: string; channel?: string },
	): Promise<ConversationMessageRow> {
		return this.request(
			"POST",
			`/api/conversations/${conversationId}/messages`,
			data,
		);
	}

	stopConversation(id: number): Promise<{ ok: boolean }> {
		return this.request("POST", `/api/conversations/${id}/stop`);
	}

	// --- Analytics ---

	getAnalytics(days?: number): Promise<AnalyticsResponse> {
		const params = days ? `?days=${days}` : "";
		return this.request("GET", `/api/analytics${params}`);
	}
}

export const api = new PanelApiClient();
