import { Outlet, NavLink } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
	{ to: "/", label: "Dashboard" },
	{ to: "/listings", label: "Listings" },
	{ to: "/triggers", label: "Triggers" },
	{ to: "/scraper", label: "Scraper" },
];

export function Layout() {
	const { logout } = useAuth();

	return (
		<div className="flex h-screen">
			<aside className="w-56 border-r bg-muted/30 p-4 flex flex-col">
				<h1 className="text-lg font-bold mb-6">Scraper Panel</h1>
				<nav className="flex flex-col gap-1">
					{NAV_ITEMS.map(({ to, label }) => (
						<NavLink
							key={to}
							to={to}
							end={to === "/"}
							className={({ isActive }) =>
								`px-3 py-2 rounded text-sm ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`
							}
						>
							{label}
						</NavLink>
					))}
				</nav>
				<div className="mt-auto">
					<Button variant="ghost" size="sm" onClick={logout}>
						Logout
					</Button>
				</div>
			</aside>
			<main className="flex-1 overflow-auto p-6">
				<Outlet />
			</main>
		</div>
	);
}
