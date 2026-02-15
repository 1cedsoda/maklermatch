import { useEffect, useState } from "react";
import { api, type AnalyticsResponse } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	BarChart3,
	TrendingUp,
	MessageSquare,
	ListChecks,
	Users,
	Loader2,
	RefreshCw,
	Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
	label: string;
	value: string | number;
	subValue?: string;
	icon: React.ReactNode;
	trend?: "up" | "down" | "neutral";
	color?: "default" | "blue" | "green" | "orange" | "red";
}

function StatCard({
	label,
	value,
	subValue,
	icon,
	color = "default",
}: StatCardProps) {
	const colorClasses = {
		default: "bg-muted text-muted-foreground",
		blue: "bg-blue-500/10 text-blue-500",
		green: "bg-green-500/10 text-green-500",
		orange: "bg-orange-500/10 text-orange-500",
		red: "bg-red-500/10 text-red-500",
	};

	return (
		<Card className="p-4">
			<div className="flex items-start justify-between">
				<div className="flex-1">
					<p className="text-xs text-muted-foreground font-medium">{label}</p>
					<p className="text-2xl font-bold mt-1">{value}</p>
					{subValue && (
						<p className="text-xs text-muted-foreground mt-1">{subValue}</p>
					)}
				</div>
				<div className={cn("rounded-lg p-2.5", colorClasses[color])}>
					{icon}
				</div>
			</div>
		</Card>
	);
}

export function DashboardPage() {
	const [data, setData] = useState<AnalyticsResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [timeRange, setTimeRange] = useState(7);

	const loadAnalytics = async (days: number, isRefresh = false) => {
		if (isRefresh) {
			setRefreshing(true);
		} else {
			setLoading(true);
		}

		try {
			const result = await api.getAnalytics(days);
			setData(result);
		} catch (err) {
			console.error("Failed to load analytics:", err);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		loadAnalytics(timeRange);
	}, [timeRange]);

	if (loading) {
		return (
			<div className="flex h-full items-center justify-center">
				<Loader2 className="size-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!data) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-sm text-muted-foreground">
					No analytics data available
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6 h-full overflow-y-auto p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Dashboard</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Overview of scraping performance, leads, and messaging activity
					</p>
				</div>
				<div className="flex items-center gap-2">
					<div className="flex items-center gap-1 border rounded-lg p-1">
						{[7, 14, 30].map((days) => (
							<Button
								key={days}
								variant={timeRange === days ? "default" : "ghost"}
								size="sm"
								onClick={() => setTimeRange(days)}
								className="h-8 px-3"
							>
								{days}d
							</Button>
						))}
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => loadAnalytics(timeRange, true)}
						disabled={refreshing}
					>
						{refreshing ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<RefreshCw className="size-4" />
						)}
					</Button>
				</div>
			</div>

			{/* Key Metrics */}
			<div>
				<h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
					<BarChart3 className="size-4" />
					Key Metrics
				</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<StatCard
						label="Total Listings"
						value={data.scraping.totalListings.toLocaleString()}
						subValue={`${data.scraping.activeListings.toLocaleString()} active`}
						icon={<ListChecks className="size-5" />}
						color="blue"
					/>
					<StatCard
						label="Lead Conversion"
						value={`${data.leads.conversionRate}%`}
						subValue={`${data.leads.activeListingsWithConversations} of ${data.scraping.activeListings} active`}
						icon={<TrendingUp className="size-5" />}
						color="green"
					/>
					<StatCard
						label="Response Rate"
						value={`${data.conversations.responseRate}%`}
						subValue={`${data.conversations.withReplies} of ${data.conversations.total} replied`}
						icon={<MessageSquare className="size-5" />}
						color="orange"
					/>
					<StatCard
						label="Messages Sent"
						value={data.messages.sentInPeriod.toLocaleString()}
						subValue={`${data.messages.receivedInPeriod} received`}
						icon={<Users className="size-5" />}
						color="default"
					/>
				</div>
			</div>

			{/* Scraping Performance */}
			<div>
				<h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
					<ListChecks className="size-4" />
					Scraping Performance ({timeRange} days)
				</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<StatCard
						label="New Listings"
						value={data.scraping.newListingsInPeriod.toLocaleString()}
						icon={<TrendingUp className="size-4" />}
					/>
					<StatCard
						label="Scraping Tasks"
						value={data.scraping.scrapingTasksInPeriod.toLocaleString()}
						subValue={`${data.scraping.successRate}% success rate`}
						icon={<BarChart3 className="size-4" />}
					/>
					<StatCard
						label="Successful Tasks"
						value={data.scraping.successfulTasks.toLocaleString()}
						icon={<ListChecks className="size-4" />}
						color="green"
					/>
					<StatCard
						label="Failed Tasks"
						value={data.scraping.failedTasks.toLocaleString()}
						icon={<ListChecks className="size-4" />}
						color="red"
					/>
				</div>
			</div>

			{/* Conversations & Messages */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Conversations by Status */}
				<Card className="p-5">
					<h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
						<MessageSquare className="size-4" />
						Conversations by Status
					</h3>
					<div className="space-y-3">
						{data.conversations.byStatus.map((item) => {
							const total = data.conversations.total;
							const percentage =
								total > 0 ? ((item.count / total) * 100).toFixed(1) : "0.0";

							const statusColors: Record<
								string,
								"default" | "secondary" | "destructive" | "outline"
							> = {
								active: "default",
								engaged: "secondary",
								reply_received: "secondary",
								rejected: "destructive",
								ghosted: "outline",
								listing_offline: "outline",
								stopped: "destructive",
								done: "outline",
							};

							return (
								<div
									key={item.status}
									className="flex items-center justify-between"
								>
									<div className="flex items-center gap-2">
										<Badge variant={statusColors[item.status] ?? "default"}>
											{item.status}
										</Badge>
										<span className="text-xs text-muted-foreground">
											{percentage}%
										</span>
									</div>
									<span className="text-sm font-medium">{item.count}</span>
								</div>
							);
						})}
					</div>
				</Card>

				{/* Conversations by Stage */}
				<Card className="p-5">
					<h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
						<Calendar className="size-4" />
						Conversations by Stage
					</h3>
					<div className="space-y-3">
						{data.conversations.byStage.map((item) => {
							const total = data.conversations.total;
							const percentage =
								total > 0 ? ((item.count / total) * 100).toFixed(1) : "0.0";

							return (
								<div
									key={item.stage}
									className="flex items-center justify-between"
								>
									<div className="flex items-center gap-2">
										<Badge variant="outline">{item.stage}</Badge>
										<span className="text-xs text-muted-foreground">
											{percentage}%
										</span>
									</div>
									<span className="text-sm font-medium">{item.count}</span>
								</div>
							);
						})}
					</div>
				</Card>
			</div>

			{/* Lead Distribution */}
			<Card className="p-5">
				<h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
					<TrendingUp className="size-4" />
					Lead Distribution
				</h3>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div className="flex flex-col gap-1">
						<p className="text-xs text-muted-foreground">
							Listings with Conversations
						</p>
						<p className="text-2xl font-bold">
							{data.leads.listingsWithConversations.toLocaleString()}
						</p>
						<div className="h-2 bg-muted rounded-full mt-2">
							<div
								className="h-full bg-green-500 rounded-full transition-all"
								style={{
									width: `${
										data.scraping.totalListings > 0
											? (
													data.leads.listingsWithConversations /
														data.scraping.totalListings
												) * 100
											: 0
									}%`,
								}}
							/>
						</div>
					</div>
					<div className="flex flex-col gap-1">
						<p className="text-xs text-muted-foreground">
							Listings without Conversations
						</p>
						<p className="text-2xl font-bold">
							{data.leads.listingsWithoutConversations.toLocaleString()}
						</p>
						<div className="h-2 bg-muted rounded-full mt-2">
							<div
								className="h-full bg-orange-500 rounded-full transition-all"
								style={{
									width: `${
										data.scraping.totalListings > 0
											? (
													data.leads.listingsWithoutConversations /
														data.scraping.totalListings
												) * 100
											: 0
									}%`,
								}}
							/>
						</div>
					</div>
					<div className="flex flex-col gap-1">
						<p className="text-xs text-muted-foreground">Total Conversations</p>
						<p className="text-2xl font-bold">
							{data.conversations.total.toLocaleString()}
						</p>
						<p className="text-xs text-muted-foreground mt-2">
							{data.conversations.inPeriod} created in last {timeRange} days
						</p>
					</div>
				</div>
			</Card>

			{/* Top Performing Targets */}
			{data.charts.topTargets.length > 0 && (
				<Card className="p-5">
					<h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
						<BarChart3 className="size-4" />
						Top Performing Targets ({timeRange} days)
					</h3>
					<div className="space-y-3">
						{data.charts.topTargets.map((target, idx) => {
							const maxListings = Math.max(
								...data.charts.topTargets.map((t) => t.totalListings),
							);
							const widthPercent =
								maxListings > 0
									? (target.totalListings / maxListings) * 100
									: 0;

							return (
								<div key={target.targetId} className="space-y-1.5">
									<div className="flex items-center justify-between text-sm">
										<div className="flex items-center gap-2 min-w-0 flex-1">
											<span className="text-xs font-mono text-muted-foreground shrink-0">
												#{idx + 1}
											</span>
											<span className="font-medium truncate">
												{target.targetName}
											</span>
										</div>
										<span className="font-bold shrink-0 ml-2">
											{target.totalListings.toLocaleString()}
										</span>
									</div>
									<div className="h-2 bg-muted rounded-full">
										<div
											className="h-full bg-blue-500 rounded-full transition-all"
											style={{ width: `${widthPercent}%` }}
										/>
									</div>
									<p className="text-xs text-muted-foreground">
										{target.taskCount} scraping{" "}
										{target.taskCount === 1 ? "task" : "tasks"}
									</p>
								</div>
							);
						})}
					</div>
				</Card>
			)}

			{/* Daily Activity Chart */}
			{data.charts.dailyActivity.length > 0 && (
				<Card className="p-5">
					<h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
						<MessageSquare className="size-4" />
						Daily Message Activity ({timeRange} days)
					</h3>
					<div className="space-y-2">
						{data.charts.dailyActivity.map((day) => {
							const maxMessages = Math.max(
								...data.charts.dailyActivity.map((d) => d.outbound + d.inbound),
							);
							const outboundPercent =
								maxMessages > 0 ? (day.outbound / maxMessages) * 100 : 0;
							const inboundPercent =
								maxMessages > 0 ? (day.inbound / maxMessages) * 100 : 0;

							return (
								<div key={day.date} className="space-y-1">
									<div className="flex items-center justify-between text-xs">
										<span className="text-muted-foreground">{day.date}</span>
										<div className="flex items-center gap-3">
											<span className="text-blue-500">↑ {day.outbound}</span>
											<span className="text-green-500">↓ {day.inbound}</span>
										</div>
									</div>
									<div className="flex gap-1 h-2">
										<div
											className="bg-blue-500 rounded-full transition-all"
											style={{ width: `${outboundPercent}%` }}
										/>
										<div
											className="bg-green-500 rounded-full transition-all"
											style={{ width: `${inboundPercent}%` }}
										/>
									</div>
								</div>
							);
						})}
					</div>
				</Card>
			)}

			{/* Daily Scraping Activity */}
			{data.charts.dailyScraping.length > 0 && (
				<Card className="p-5">
					<h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
						<ListChecks className="size-4" />
						Daily Scraping Activity ({timeRange} days)
					</h3>
					<div className="space-y-2">
						{data.charts.dailyScraping.map((day) => {
							const maxListings = Math.max(
								...data.charts.dailyScraping.map((d) => d.listingsFound),
							);
							const listingsPercent =
								maxListings > 0 ? (day.listingsFound / maxListings) * 100 : 0;

							return (
								<div key={day.date} className="space-y-1">
									<div className="flex items-center justify-between text-xs">
										<span className="text-muted-foreground">{day.date}</span>
										<div className="flex items-center gap-3">
											<span className="text-blue-500">
												{day.listingsFound} listings
											</span>
											<span className="text-green-500">
												{day.success} success
											</span>
											{day.error > 0 && (
												<span className="text-red-500">{day.error} errors</span>
											)}
										</div>
									</div>
									<div className="h-2 bg-muted rounded-full">
										<div
											className="h-full bg-blue-500 rounded-full transition-all"
											style={{ width: `${listingsPercent}%` }}
										/>
									</div>
								</div>
							);
						})}
					</div>
				</Card>
			)}
		</div>
	);
}
