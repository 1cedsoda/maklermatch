import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useState, useMemo } from "react";
import { TEST_LISTINGS, type Listing } from "@/data/listings";
import { TEST_BROKERS, type BrokerProfile } from "@/data/brokers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
	Send,
	Sparkles,
	Building2,
	User,
	ChevronDown,
	ChevronUp,
	MapPin,
	Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatPage() {
	const [selectedListing, setSelectedListing] = useState<Listing>(
		TEST_LISTINGS[0],
	);
	const [selectedBroker, setSelectedBroker] = useState<BrokerProfile>(
		TEST_BROKERS[0],
	);
	const [brokerExpanded, setBrokerExpanded] = useState(true);
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
		<div className="flex h-full gap-6">
			{/* Sidebar */}
			<div className="flex w-80 shrink-0 flex-col gap-4">
				{/* Makler Section */}
				<Card className="gap-0 overflow-hidden py-0">
					<button
						type="button"
						onClick={() => setBrokerExpanded(!brokerExpanded)}
						className="flex items-center justify-between px-4 py-3"
					>
						<div className="flex items-center gap-2">
							<User className="size-4 text-muted-foreground" />
							<span className="text-sm font-semibold">Makler</span>
						</div>
						{brokerExpanded ? (
							<ChevronUp className="size-4 text-muted-foreground" />
						) : (
							<ChevronDown className="size-4 text-muted-foreground" />
						)}
					</button>

					{brokerExpanded && (
						<div className="border-t px-3 py-3">
							<div className="flex flex-col gap-1.5">
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
										className={cn(
											"w-full rounded-lg px-3 py-2.5 text-left transition-colors",
											selectedBroker.id === broker.id
												? "bg-primary text-primary-foreground"
												: "hover:bg-muted",
										)}
									>
										<p
											className={cn(
												"text-sm font-medium",
												selectedBroker.id === broker.id
													? "text-primary-foreground"
													: "text-foreground",
											)}
										>
											{broker.name}
										</p>
										<p
											className={cn(
												"mt-0.5 text-xs",
												selectedBroker.id === broker.id
													? "text-primary-foreground/70"
													: "text-muted-foreground",
											)}
										>
											{broker.firma}
										</p>
									</button>
								))}
							</div>

							<div className="mt-3 rounded-lg bg-muted px-3 py-2.5">
								<p className="text-xs font-medium text-foreground">
									{selectedBroker.spezialisierung}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{selectedBroker.erfahrungJahre} Jahre &middot;{" "}
									{selectedBroker.region}
								</p>
							</div>
						</div>
					)}
				</Card>

				{/* Inserate Section */}
				<Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0">
					<div className="flex items-center gap-2 px-4 py-3">
						<Building2 className="size-4 text-muted-foreground" />
						<span className="text-sm font-semibold">Inserate</span>
					</div>

					<div className="flex-1 overflow-y-auto border-t px-3 py-3">
						<div className="flex flex-col gap-1.5">
							{TEST_LISTINGS.map((listing) => (
								<button
									key={listing.id}
									type="button"
									onClick={() => {
										setSelectedListing(listing);
										setGenerateMeta(null);
									}}
									className={cn(
										"w-full rounded-lg px-3 py-2.5 text-left transition-colors",
										selectedListing.id === listing.id
											? "bg-primary text-primary-foreground"
											: "hover:bg-muted",
									)}
								>
									<p
										className={cn(
											"text-sm font-medium leading-snug",
											selectedListing.id === listing.id
												? "text-primary-foreground"
												: "text-foreground",
										)}
									>
										{listing.title}
									</p>
									<div className="mt-1 flex items-center gap-1.5">
										<MapPin
											className={cn(
												"size-3",
												selectedListing.id === listing.id
													? "text-primary-foreground/70"
													: "text-muted-foreground",
											)}
										/>
										<span
											className={cn(
												"text-xs",
												selectedListing.id === listing.id
													? "text-primary-foreground/70"
													: "text-muted-foreground",
											)}
										>
											{listing.location} &middot; {listing.price}
										</span>
									</div>
								</button>
							))}
						</div>
					</div>

					{/* Generate Button */}
					<div className="border-t px-4 py-3">
						<div className="mb-3">
							<p className="text-xs text-muted-foreground">Ausgewählt</p>
							<p className="mt-0.5 text-sm font-medium">
								{selectedListing.title}
							</p>
							<p className="text-xs text-muted-foreground">
								{selectedListing.location} &middot; {selectedListing.price}
							</p>
						</div>
						<Button
							onClick={handleGenerate}
							disabled={generating}
							className="w-full"
						>
							{generating ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Sparkles className="size-4" />
							)}
							{generating ? "Generiert..." : "Erstnachricht generieren"}
						</Button>
					</div>
				</Card>
			</div>

			{/* Chat Area */}
			<Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0">
				{/* Header */}
				<div className="flex items-center justify-between border-b px-5 py-3">
					<div>
						<h2 className="text-sm font-semibold">Chat</h2>
						<p className="text-xs text-muted-foreground">
							Verkäufer: {selectedListing.sellerName} &middot; Makler:{" "}
							{selectedBroker.name}
						</p>
					</div>
					{generateMeta && (
						<Badge variant="outline">Score {generateMeta.score}/10</Badge>
					)}
				</div>

				{/* Messages */}
				<div className="flex-1 overflow-y-auto px-5 py-6">
					<div className="mx-auto max-w-2xl space-y-4">
						{messages.length === 0 && (
							<div className="flex flex-col items-center justify-center py-16 text-center">
								<Building2 className="mb-3 size-10 text-muted-foreground/40" />
								<p className="text-sm text-muted-foreground">
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
										className={cn(
											"flex",
											m.role === "user" ? "justify-end" : "justify-start",
										)}
									>
										<div
											className={cn(
												"max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
												isGenerated
													? "border border-emerald-200 bg-emerald-50 text-emerald-900"
													: m.role === "user"
														? "bg-primary text-primary-foreground"
														: "bg-muted text-foreground",
											)}
										>
											{text}
										</div>
									</div>
									{isGenerated && (
										<p className="mt-1.5 px-1 text-xs text-muted-foreground">
											Score {generateMeta.score}/10 &middot; Generiert
										</p>
									)}
								</div>
							);
						})}

						{status === "submitted" && (
							<div className="flex justify-start">
								<div className="rounded-xl bg-muted px-4 py-2.5">
									<Loader2 className="size-4 animate-spin text-muted-foreground" />
								</div>
							</div>
						)}

						<div ref={messagesEndRef} />
					</div>
				</div>

				{/* Input */}
				<div className="border-t px-5 py-3">
					<form
						onSubmit={handleSubmit}
						className="mx-auto flex max-w-2xl gap-2"
					>
						<Input
							value={input}
							onChange={(e) => setInput(e.target.value)}
							placeholder="Nachricht schreiben..."
							autoFocus
						/>
						<Button
							type="submit"
							disabled={isLoading || !input.trim()}
							size="icon"
						>
							<Send className="size-4" />
						</Button>
					</form>
				</div>
			</Card>
		</div>
	);
}
