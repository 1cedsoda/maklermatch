import {
	SCRAPER_SECRET,
	SCRAPER_SECRET_HEADER,
	type CreateTriggerRequest,
	type CreateTriggerResponse,
	type UpdateTriggerRequest,
	type IngestListingsRequest,
	type IngestListingsResponse,
} from "@scraper/api-types";

export class ApiClient {
	private baseUrl: string;

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl.replace(/\/$/, "");
	}

	private async request<T>(
		method: string,
		path: string,
		body?: unknown,
	): Promise<T> {
		const res = await fetch(`${this.baseUrl}${path}`, {
			method,
			headers: {
				"Content-Type": "application/json",
				[SCRAPER_SECRET_HEADER]: SCRAPER_SECRET,
			},
			body: body ? JSON.stringify(body) : undefined,
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(
				`API request failed: ${method} ${path} → ${res.status} ${text}`,
			);
		}

		return res.json() as Promise<T>;
	}

	async createTrigger(
		data: CreateTriggerRequest,
	): Promise<CreateTriggerResponse> {
		return this.request("POST", "/api/ingest/trigger", data);
	}

	async updateTrigger(id: number, data: UpdateTriggerRequest): Promise<void> {
		await this.request("PATCH", `/api/ingest/trigger/${id}`, data);
	}

	async ingestListings(
		data: IngestListingsRequest,
	): Promise<IngestListingsResponse> {
		return this.request("POST", "/api/ingest/listings", data);
	}
}
