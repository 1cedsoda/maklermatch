import type {
	LoginRequest,
	LoginResponse,
	ListingsResponse,
	ListingWithVersions,
	TriggersResponse,
} from "@scraper/api-types";

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

	getTriggers(city?: string): Promise<TriggersResponse> {
		const params = city ? `?city=${encodeURIComponent(city)}` : "";
		return this.request("GET", `/api/triggers${params}`);
	}

	getScraperStatus(): Promise<{
		quest: { id: number; city: string } | null;
		isRunning: boolean;
		lastRunAt: string | null;
	}> {
		return this.request("GET", "/api/scraper/status");
	}

	triggerScrape(): Promise<{ message: string }> {
		return this.request("POST", "/api/scraper/trigger");
	}
}

export const api = new PanelApiClient();
