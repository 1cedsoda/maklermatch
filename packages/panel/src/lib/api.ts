import type {
	LoginRequest,
	LoginResponse,
	ListingsResponse,
	ListingWithVersions,
	ScrapingTasksResponse,
	ScrapingTaskDetailResponse,
	QuestsResponse,
	SearchQuest,
	CreateQuestRequest,
	UpdateQuestRequest,
	SchedulerStatusResponse,
	SellersResponse,
	SellerWithSnapshots,
} from "@scraper/api-types";

export interface BrokerCriteria {
	plzPrefixes?: string[];
	cities?: string[];
	bundeslaender?: string[];
	propertyTypes?: string[];
	minPrice?: number;
	maxPrice?: number;
}

export interface BrokerRow {
	id: number;
	name: string;
	firma: string;
	region: string;
	spezialisierung: string | null;
	erfahrungJahre: number | null;
	provision: string | null;
	arbeitsweise: string | null;
	leistungen: string[] | null;
	besonderheiten: string[] | null;
	telefon: string | null;
	email: string;
	criteriaJson: BrokerCriteria | null;
	active: boolean;
	createdAt: string;
}

export interface BrokerInput {
	name: string;
	firma: string;
	region: string;
	spezialisierung?: string;
	erfahrungJahre?: number;
	provision?: string;
	arbeitsweise?: string;
	leistungen?: string[];
	besonderheiten?: string[];
	telefon?: string;
	email: string;
	criteriaJson?: BrokerCriteria;
}

export interface ScraperStatusResponse {
	isRunning: boolean;
	lastRunAt: string | null;
	memoryMb?: {
		rss: number;
		heapUsed: number;
		heapTotal: number;
	};
	currentTask: {
		id: number;
		questId: number;
		questName: string;
		questLocation: string;
	} | null;
	scrapers: {
		id: string;
		name: string;
		source: string;
		cities: string[];
	}[];
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
		questId?: number;
		limit?: number;
	}): Promise<ScrapingTasksResponse> {
		const params = new URLSearchParams();
		if (opts?.questId) params.set("questId", String(opts.questId));
		if (opts?.limit) params.set("limit", String(opts.limit));
		const qs = params.toString();
		return this.request("GET", `/api/scraping-tasks${qs ? `?${qs}` : ""}`);
	}

	getSchedulerStatus(): Promise<SchedulerStatusResponse> {
		return this.request("GET", "/api/quests/scheduler-status");
	}

	getScraperStatus(): Promise<ScraperStatusResponse> {
		return this.request("GET", "/api/scraper/status");
	}

	startScrape(
		questId: number,
		opts?: { headless?: boolean },
	): Promise<{ message: string }> {
		return this.request("POST", "/api/scraper/start", {
			questId,
			...opts,
		});
	}

	getQuests(): Promise<QuestsResponse> {
		return this.request("GET", "/api/quests");
	}

	getQuest(id: number): Promise<SearchQuest> {
		return this.request("GET", `/api/quests/${id}`);
	}

	createQuest(data: CreateQuestRequest): Promise<SearchQuest> {
		return this.request("POST", "/api/quests", data);
	}

	updateQuest(id: number, data: UpdateQuestRequest): Promise<SearchQuest> {
		return this.request("PATCH", `/api/quests/${id}`, data);
	}

	async deleteQuest(id: number): Promise<void> {
		await this.request("DELETE", `/api/quests/${id}`);
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
}

export const api = new PanelApiClient();
