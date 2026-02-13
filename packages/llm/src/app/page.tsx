"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useState } from "react";

const transport = new DefaultChatTransport({ api: "/api/chat" });

export default function Chat() {
	const { messages, sendMessage, status } = useChat({ transport });
	const [input, setInput] = useState("");
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

	function getTextContent(m: (typeof messages)[number]) {
		const textParts = m.parts.filter((p) => p.type === "text");
		return textParts.map((p) => p.text).join("");
	}

	return (
		<div className="flex h-screen flex-col bg-white dark:bg-zinc-950">
			{/* Header */}
			<header className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
				<div className="mx-auto max-w-2xl">
					<h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
						Maklermatch
					</h1>
					<p className="text-sm text-zinc-500">Chat mit Max</p>
				</div>
			</header>

			{/* Messages */}
			<div className="flex-1 overflow-y-auto px-4 py-6">
				<div className="mx-auto max-w-2xl space-y-4">
					{messages.length === 0 && (
						<div className="py-12 text-center text-zinc-400">
							<p className="text-lg">Hey! Schreib mir einfach.</p>
						</div>
					)}

					{messages.map((m) => {
						const text = getTextContent(m);
						if (!text) return null;
						return (
							<div
								key={m.id}
								className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
							>
								<div
									className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap ${
										m.role === "user"
											? "bg-blue-600 text-white"
											: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
									}`}
								>
									{text}
								</div>
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

			{/* Input */}
			<div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
				<form onSubmit={handleSubmit} className="mx-auto flex max-w-2xl gap-2">
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
	);
}
