import { Outlet, NavLink } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import {
	LayoutDashboard,
	List,
	Users,
	Search,
	Zap,
	Bot,
	LogOut,
	MessageSquare,
	MessagesSquare,
	Briefcase,
	Building2,
	type LucideIcon,
} from "lucide-react";

type NavSection = {
	label?: string;
	items: { to: string; label: string; icon: LucideIcon }[];
};

const NAV_SECTIONS: NavSection[] = [
	{
		items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }],
	},
	{
		label: "Verwaltung",
		items: [
			{ to: "/companies", label: "Companies", icon: Building2 },
			{ to: "/brokers", label: "Users", icon: Briefcase },
		],
	},
	{
		label: "Outreach",
		items: [
			{ to: "/conversations", label: "Konversationen", icon: MessagesSquare },
		],
	},
	{
		label: "Scraping",
		items: [
			{ to: "/targets", label: "Scraping Targets", icon: Search },
			{ to: "/scraping-tasks", label: "Scraping Runs", icon: Zap },
			{ to: "/scraper", label: "Scraper", icon: Bot },
			{ to: "/listings", label: "Listings", icon: List },
			{ to: "/sellers", label: "Leads", icon: Users },
		],
	},
	{
		label: "Dev",
		items: [{ to: "/chat", label: "AI Sandbox", icon: MessageSquare }],
	},
];

export function Layout() {
	const { logout } = useAuth();

	return (
		<div className="flex h-screen">
			<aside className="w-56 border-r bg-sidebar flex flex-col">
				<div className="px-5 py-5">
					<h1 className="text-base font-semibold tracking-tight text-sidebar-foreground">
						Traumwohnung.ai
					</h1>
				</div>
				<nav className="flex-1 flex flex-col gap-4 px-3 overflow-y-auto">
					{NAV_SECTIONS.map((section) => (
						<div key={section.label ?? "_top"}>
							{section.label && (
								<div className="px-3 pb-1 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
									{section.label}
								</div>
							)}
							<div className="flex flex-col gap-0.5">
								{section.items.map(({ to, label, icon: Icon }) => (
									<NavLink
										key={to}
										to={to}
										end={to === "/"}
										className={({ isActive }) =>
											`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors ${
												isActive
													? "bg-sidebar-primary text-sidebar-primary-foreground"
													: "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
											}`
										}
									>
										<Icon className="size-4 shrink-0" />
										{label}
									</NavLink>
								))}
							</div>
						</div>
					))}
				</nav>
				<div className="border-t border-sidebar-border px-3 py-3">
					<button
						onClick={logout}
						className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
					>
						<LogOut className="size-4 shrink-0" />
						Logout
					</button>
				</div>
			</aside>
			<main className="flex-1 overflow-auto p-6 h-full min-h-0">
				<Outlet />
			</main>
		</div>
	);
}
