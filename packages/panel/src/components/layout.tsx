import { Outlet, NavLink } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import {
	LayoutDashboard,
	List,
	Search,
	Zap,
	Bot,
	LogOut,
	type LucideIcon,
} from "lucide-react";

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
	{ to: "/", label: "Dashboard", icon: LayoutDashboard },
	{ to: "/listings", label: "Listings", icon: List },
	{ to: "/quests", label: "Quests", icon: Search },
	{ to: "/scraping-tasks", label: "Scraping Tasks", icon: Zap },
	{ to: "/scraper", label: "Scraper", icon: Bot },
];

export function Layout() {
	const { logout } = useAuth();

	return (
		<div className="flex h-screen">
			<aside className="w-56 border-r bg-sidebar flex flex-col">
				<div className="px-5 py-5">
					<h1 className="text-base font-semibold tracking-tight text-sidebar-foreground">
						Makler Match
					</h1>
				</div>
				<nav className="flex-1 flex flex-col gap-0.5 px-3">
					{NAV_ITEMS.map(({ to, label, icon: Icon }) => (
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
			<main className="flex-1 overflow-auto p-6">
				<Outlet />
			</main>
		</div>
	);
}
