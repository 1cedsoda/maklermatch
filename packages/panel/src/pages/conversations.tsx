import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import {
	api,
	type ConversationRow,
	type ConversationDetail,
	type ConversationMessageRow,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare, Loader2, Square, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<
	string,
	{
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
	}
> = {
	active: { label: "Active", variant: "default" },
	reply_received: { label: "Reply", variant: "secondary" },
	stopped: { label: "Stopped", variant: "destructive" },
	done: { label: "Done", variant: "outline" },
};

function formatRelativeTime(dateStr: string | null): string {
	if (!dateStr) return "";
	const diff = Date.now() - new Date(dateStr).getTime();
	const minutes = Math.floor(diff / 60000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes} min ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} hr ago`;
	const days = Math.floor(hours / 24);
	return `${days} d ago`;
}

function dbMessagesToUIMessages(
	messages: ConversationMessageRow[],
): UIMessage[] {
	return messages.map((m) => ({
		id: `db-${m.id}`,
		role:
			m.direction === "outbound" ? ("assistant" as const) : ("user" as const),
		parts: [{ type: "text" as const, text: m.body }],
	}));
}

export function ConversationsPage() {
	const [conversations, setConversations] = useState<ConversationRow[]>([]);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [detail, setDetail] = useState<ConversationDetail | null>(null);
	const [loadingList, setLoadingList] = useState(true);
	const [loadingDetail, setLoadingDetail] = useState(false);
	const [input, setInput] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Load conversation list
	const loadConversations = useCallback(() => {
		setLoadingList(true);
		api
			.getConversations()
			.then(setConversations)
			.catch(() => {})
			.finally(() => setLoadingList(false));
	}, []);

	useEffect(() => {
		loadConversations();
	}, [loadConversations]);

	// Load conversation detail when selected
	useEffect(() => {
		if (selectedId === null) {
			setDetail(null);
			return;
		}
		setLoadingDetail(true);
		api
			.getConversation(selectedId)
			.then(setDetail)
			.catch(() => setDetail(null))
			.finally(() => setLoadingDetail(false));
	}, [selectedId]);

	// Build broker profile for AI SDK transport
	const brokerProfile = useMemo(() => {
		const b = detail?.broker;
		if (!b) return undefined;
		return {
			name: b.name,
			company: b.companyName ?? "",
			phone: b.phone ?? "",
			email: b.email,
			bio: b.bio ?? "",
		};
	}, [detail?.broker]);

	const listingText = useMemo(() => {
		const l = detail?.listing;
		if (!l) return undefined;
		return [l.title, l.price, l.location, "", l.description]
			.filter(Boolean)
			.join("\n");
	}, [detail?.listing]);

	// Refs for transport body callback
	const brokerRef = useRef(brokerProfile);
	brokerRef.current = brokerProfile;
	const listingRef = useRef(listingText);
	listingRef.current = listingText;

	// AI SDK transport — recreated per conversation
	const transport = useMemo(() => {
		if (!detail) return null;
		return new DefaultChatTransport({
			api: "/api/chat",
			body: () => ({
				brokerProfile: brokerRef.current,
				listingText: listingRef.current,
			}),
		});
	}, [detail?.id]);

	// Convert DB messages to initial UIMessages
	const initialMessages = useMemo(
		() => (detail ? dbMessagesToUIMessages(detail.messages) : []),
		[detail?.id, detail?.messages.length],
	);

	const { messages, sendMessage, setMessages, status } = useChat({
		transport: transport ?? undefined,
	});

	// Load DB messages when conversation changes
	useEffect(() => {
		setMessages(initialMessages);
	}, [detail?.id, initialMessages]);

	const isLoading = status === "submitted" || status === "streaming";
	const isStopped = detail?.status === "stopped" || detail?.status === "done";

	// Scroll to bottom on new messages
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	// Persist AI response after streaming completes
	const prevStatusRef = useRef(status);
	useEffect(() => {
		if (prevStatusRef.current === "streaming" && status === "ready" && detail) {
			const lastMsg = messages[messages.length - 1];
			if (lastMsg?.role === "assistant") {
				const text = lastMsg.parts
					.filter((p) => p.type === "text")
					.map((p) => (p as { type: "text"; text: string }).text)
					.join("");
				if (text) {
					api.saveConversationMessage(detail.id, {
						direction: "outbound",
						body: text,
					});
				}
			}
		}
		prevStatusRef.current = status;
	}, [status]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!input.trim() || isLoading || !detail || isStopped) return;

		const text = input.trim();
		setInput("");

		// Persist the user/seller message
		await api.saveConversationMessage(detail.id, {
			direction: "inbound",
			body: text,
		});

		// Send to AI for broker response
		sendMessage({ text });
	}

	async function handleStop() {
		if (!detail) return;
		await api.stopConversation(detail.id);
		setDetail({ ...detail, status: "stopped" });
		setConversations((prev) =>
			prev.map((c) => (c.id === detail.id ? { ...c, status: "stopped" } : c)),
		);
	}

	function getTextContent(m: (typeof messages)[number]) {
		return m.parts
			.filter((p) => p.type === "text")
			.map((p) => (p as { type: "text"; text: string }).text)
			.join("");
	}

	return (
		<div className="flex h-full gap-6">
			{/* Sidebar — Conversation List */}
			<Card className="flex w-80 shrink-0 flex-col gap-0 overflow-hidden py-0">
				<div className="flex items-center gap-2 border-b px-4 py-3">
					<MessageSquare className="size-4 text-muted-foreground" />
					<span className="text-sm font-semibold">Conversations</span>
					<span className="ml-auto text-xs text-muted-foreground">
						{conversations.length}
					</span>
				</div>

				<div className="flex-1 overflow-y-auto px-3 py-3">
					{loadingList ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="size-5 animate-spin text-muted-foreground" />
						</div>
					) : conversations.length === 0 ? (
						<p className="px-3 py-8 text-center text-xs text-muted-foreground">
							No conversations available.
						</p>
					) : (
						<div className="flex flex-col gap-1.5">
							{conversations.map((conv) => {
								const statusInfo =
									STATUS_LABELS[conv.status] ?? STATUS_LABELS.active;
								return (
									<button
										key={conv.id}
										type="button"
										onClick={() => setSelectedId(conv.id)}
										className={cn(
											"w-full rounded-lg px-3 py-2.5 text-left transition-colors",
											selectedId === conv.id
												? "bg-primary text-primary-foreground"
												: "hover:bg-muted",
										)}
									>
										<div className="flex items-center justify-between gap-2">
											<p
												className={cn(
													"truncate text-sm font-medium",
													selectedId === conv.id
														? "text-primary-foreground"
														: "text-foreground",
												)}
											>
												{conv.sellerName || "Unknown"}
											</p>
											<Badge
												variant={
													selectedId === conv.id
														? "outline"
														: statusInfo.variant
												}
												className={cn(
													"shrink-0 text-[10px]",
													selectedId === conv.id &&
														"border-primary-foreground/30 text-primary-foreground",
												)}
											>
												{statusInfo.label}
											</Badge>
										</div>
										<p
											className={cn(
												"mt-0.5 truncate text-xs",
												selectedId === conv.id
													? "text-primary-foreground/70"
													: "text-muted-foreground",
											)}
										>
											{conv.listingTitle || conv.listingId}
										</p>
										{conv.lastMessageAt && (
											<p
												className={cn(
													"mt-0.5 text-[10px]",
													selectedId === conv.id
														? "text-primary-foreground/50"
														: "text-muted-foreground/70",
												)}
											>
												{formatRelativeTime(conv.lastMessageAt)}
											</p>
										)}
									</button>
								);
							})}
						</div>
					)}
				</div>
			</Card>

			{/* Chat Area */}
			<Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0">
				{!detail && !loadingDetail ? (
					<div className="flex flex-1 flex-col items-center justify-center text-center">
						<MessageSquare className="mb-3 size-10 text-muted-foreground/40" />
						<p className="text-sm text-muted-foreground">
							Select a conversation from the list.
						</p>
					</div>
				) : loadingDetail ? (
					<div className="flex flex-1 items-center justify-center">
						<Loader2 className="size-6 animate-spin text-muted-foreground" />
					</div>
				) : (
					<>
						{/* Header */}
						<div className="flex items-center justify-between border-b px-5 py-3">
							<div className="min-w-0">
								<h2 className="truncate text-sm font-semibold">
									{detail!.sellerName || "Unknown"}
								</h2>
								<p className="truncate text-xs text-muted-foreground">
									{detail!.listing?.title ?? detail!.listingId}
									{detail!.broker && <> &middot; User: {detail!.broker.name}</>}
								</p>
							</div>
							<div className="flex items-center gap-2 shrink-0">
								<Badge
									variant={STATUS_LABELS[detail!.status]?.variant ?? "outline"}
								>
									{STATUS_LABELS[detail!.status]?.label ?? detail!.status}
								</Badge>
								{!isStopped && (
									<Button variant="outline" size="sm" onClick={handleStop}>
										<Square className="size-3" />
										Stop
									</Button>
								)}
							</div>
						</div>

						{/* Messages */}
						<div className="flex-1 overflow-y-auto px-5 py-6">
							<div className="mx-auto max-w-2xl space-y-4">
								{messages.length === 0 && (
									<div className="flex flex-col items-center justify-center py-16 text-center">
										<MessageSquare className="mb-3 size-10 text-muted-foreground/40" />
										<p className="text-sm text-muted-foreground">
											No messages yet.
										</p>
									</div>
								)}

								{messages.map((m) => {
									const text = getTextContent(m);
									if (!text) return null;
									const isOutbound = m.role === "assistant";
									return (
										<div key={m.id}>
											<div
												className={cn(
													"flex items-end gap-2",
													isOutbound ? "justify-end" : "justify-start",
												)}
											>
												{!isOutbound && (
													<div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
														<User className="size-3 text-muted-foreground" />
													</div>
												)}
												<div
													className={cn(
														"max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
														isOutbound
															? "bg-primary text-primary-foreground"
															: "bg-muted text-foreground",
													)}
												>
													{text}
												</div>
												{isOutbound && (
													<div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
														<Bot className="size-3 text-primary" />
													</div>
												)}
											</div>
										</div>
									);
								})}

								{status === "submitted" && (
									<div className="flex items-end gap-2">
										<div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
											<Bot className="size-3 text-primary" />
										</div>
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
							{isStopped ? (
								<p className="text-center text-xs text-muted-foreground">
									Conversation ended.
								</p>
							) : (
								<form
									onSubmit={handleSubmit}
									className="mx-auto flex max-w-2xl gap-2"
								>
									<Input
										value={input}
										onChange={(e) => setInput(e.target.value)}
										placeholder="Enter seller message..."
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
							)}
						</div>
					</>
				)}
			</Card>
		</div>
	);
}
