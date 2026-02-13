"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useState, useMemo } from "react";
import { TEST_LISTINGS, type Listing } from "./data/listings";
import { TEST_BROKERS, type BrokerProfile } from "./data/brokers";

export default function Chat() {
	const [selectedListing, setSelectedListing] = useState<Listing>(
		TEST_LISTINGS[0],
	);
	const [selectedBroker, setSelectedBroker] = useState<BrokerProfile>(
		TEST_BROKERS[0],
	);
	const brokerRef = useRef(selectedBroker);
	brokerRef.current = selectedBroker;
	const listingRef = useRef(selectedListing);
	listingRef.current = selectedListing;

	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: "/api/chat",
				body: () => ({
					brokerProfile: brokerRef.current,
					listingText: listingRef.current.rawText,
				}),
			}),
		[],
	);

	const { messages, sendMessage, setMessages, status } = useChat({
		transport,
	});
	const [input, setInput] = useState("");
	const [generating, setGenerating] = useState(false);
	const [generateMeta, setGenerateMeta] = useState<{
		score: number;
	} | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const isLoading = status === "submitted" || status === "streaming";

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!input.trim() || isLoading) return;
		sendMessage({ text: input });
		setInput("");
	}

	async function handleGenerate() {
		if (generating) return;
		setGenerating(true);
		setGenerateMeta(null);

		try {
			const res = await fetch("/api/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					listingText: selectedListing.rawText,
					listingId: selectedListing.id,
					sellerName: selectedListing.sellerName,
					persona: {
						name: selectedBroker.name,
						firma: selectedBroker.firma,
						region: selectedBroker.region,
					},
				}),
			});

			if (!res.ok) {
				const err = await res.text();
				console.error("Generate failed:", err);
				return;
			}

			const data = await res.json();
			setGenerateMeta({ score: data.score });
			setMessages([
				{
					id: `gen-${Date.now()}`,
					role: "assistant",
					parts: [{ type: "text", text: data.text }],
				},
			]);
		} catch (err) {
			console.error("Generate error:", err);
		} finally {
			setGenerating(false);
		}
	}

	function getTextContent(m: (typeof messages)[number]) {
		const textParts = m.parts.filter((p) => p.type === "text");
		return textParts.map((p) => p.text).join("");
	}

	return (
		<div className="flex h-screen bg-white dark:bg-zinc-950">
			{/* Sidebar */}
			<aside className="flex w-80 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
				{/* Makler */}
				<div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
					<h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
						Makler
					</h2>
				</div>
				<div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
					{TEST_BROKERS.map((broker) => (
						<button
							key={broker.id}
							type="button"
							onClick={() => {
								if (broker.id !== selectedBroker.id) {
									setSelectedBroker(broker);
									setMessages([]);
									setGenerateMeta(null);
								}
							}}
							className={`mb-2 w-full rounded-xl p-3 text-left transition-colors ${
								selectedBroker.id === broker.id
									? "bg-violet-50 ring-1 ring-violet-200 dark:bg-violet-950 dark:ring-violet-800"
									: "hover:bg-zinc-50 dark:hover:bg-zinc-900"
							}`}
						>
							<p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
								{broker.name}
							</p>
							<p className="mt-0.5 text-xs text-zinc-500">
								{broker.firma} &middot; {broker.region}
							</p>
						</button>
					))}
					<div className="mt-1 rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-900">
						<p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
							{selectedBroker.spezialisierung}
						</p>
						<p className="mt-1 text-xs text-zinc-500">
							{selectedBroker.erfahrungJahre} Jahre Erfahrung &middot;{" "}
							{selectedBroker.provision}
						</p>
					</div>
				</div>

				{/* Inserate */}
				<div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
					<h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
						Inserate
					</h2>
				</div>
				<div className="flex-1 overflow-y-auto p-3">
					{TEST_LISTINGS.map((listing) => (
						<button
							key={listing.id}
							type="button"
							onClick={() => {
								setSelectedListing(listing);
								setGenerateMeta(null);
							}}
							className={`mb-2 w-full rounded-xl p-3 text-left transition-colors ${
								selectedListing.id === listing.id
									? "bg-blue-50 ring-1 ring-blue-200 dark:bg-blue-950 dark:ring-blue-800"
									: "hover:bg-zinc-50 dark:hover:bg-zinc-900"
							}`}
						>
							<p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
								{listing.title}
							</p>
							<p className="mt-1 text-xs text-zinc-500">
								{listing.location} &middot; {listing.price}
							</p>
						</button>
					))}
				</div>

				{/* Generate */}
				<div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
					<p className="text-xs font-medium text-zinc-500">Ausgewählt</p>
					<p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
						{selectedListing.title}
					</p>
					<p className="text-xs text-zinc-500">
						{selectedListing.location} &middot; {selectedListing.price}
					</p>
					<button
						type="button"
						onClick={handleGenerate}
						disabled={generating}
						className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
					>
						{generating ? "Generiert..." : "Erstnachricht generieren"}
					</button>
				</div>
			</aside>

			{/* Chat */}
			<div className="flex flex-1 flex-col">
				<header className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
					<h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
						Maklermatch
					</h1>
					<p className="text-sm text-zinc-500">
						Chat mit Max &middot; Makler: {selectedBroker.name}
					</p>
				</header>

				<div className="flex-1 overflow-y-auto px-4 py-6">
					<div className="mx-auto max-w-2xl space-y-4">
						{messages.length === 0 && (
							<div className="py-12 text-center text-zinc-400">
								<p className="text-lg">
									Wähle ein Inserat und generiere eine Nachricht.
								</p>
							</div>
						)}

						{messages.map((m, i) => {
							const text = getTextContent(m);
							if (!text) return null;
							const isGenerated =
								i === 0 && m.role === "assistant" && generateMeta;
							return (
								<div key={m.id}>
									<div
										className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
									>
										<div
											className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap ${
												isGenerated
													? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:ring-emerald-800"
													: m.role === "user"
														? "bg-blue-600 text-white"
														: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
											}`}
										>
											{text}
										</div>
									</div>
									{isGenerated && (
										<p className="mt-1 px-1 text-xs text-zinc-400">
											Score {generateMeta.score}/10
										</p>
									)}
								</div>
							);
						})}

						{status === "submitted" && (
							<div className="flex justify-start">
								<div className="rounded-2xl bg-zinc-100 px-4 py-2.5 text-zinc-400 dark:bg-zinc-800">
									<span className="animate-pulse">...</span>
								</div>
							</div>
						)}

						<div ref={messagesEndRef} />
					</div>
				</div>

				<div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
					<form
						onSubmit={handleSubmit}
						className="mx-auto flex max-w-2xl gap-2"
					>
						<input
							value={input}
							onChange={(e) => setInput(e.target.value)}
							placeholder="Nachricht schreiben..."
							className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-[15px] text-zinc-900 placeholder-zinc-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
							autoFocus
						/>
						<button
							type="submit"
							disabled={isLoading || !input.trim()}
							className="rounded-xl bg-blue-600 px-5 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
						>
							Senden
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
