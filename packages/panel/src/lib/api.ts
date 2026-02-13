import type {
	LoginRequest,
	LoginResponse,
	ListingsResponse,
	ListingWithVersions,
	ScrapingTasksResponse,
	QuestsResponse,
	SearchQuest,
	CreateQuestRequest,
	UpdateQuestRequest,
	SchedulerStatusResponse,
	SellersResponse,
	SellerWithSnapshots,
} from "@scraper/api-types";

export interface ScraperStatusResponse {
	isRunning: boolean;
	lastRunAt: string | null;
	currentTask: {
		id: number;
		questId: number;
		questName: string;
		questLocation: string;
	} | null;
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

	startScrape(questId: number): Promise<{ message: string }> {
		return this.request("POST", "/api/scraper/start", { questId });
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

	getSellers(page = 1, limit = 20): Promise<SellersResponse> {
		return this.request("GET", `/api/sellers?page=${page}&limit=${limit}`);
	}

	getSeller(id: number): Promise<SellerWithSnapshots> {
		return this.request("GET", `/api/sellers/${id}`);
	}
}

export const api = new PanelApiClient();
