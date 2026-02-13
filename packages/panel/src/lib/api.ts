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
		targetId: number;
		targetName: string;
		targetLocation: string;
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
