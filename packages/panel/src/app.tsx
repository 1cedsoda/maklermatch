import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";
import { Layout } from "@/components/layout";
import { LoginPage } from "@/pages/login";
import { DashboardPage } from "@/pages/dashboard";
import { ListingsPage } from "@/pages/listings";
import { ListingDetailPage } from "@/pages/listing-detail";
import { ScrapingTasksPage } from "@/pages/scraping-tasks";
import { ScraperPage } from "@/pages/scraper";
import { QuestsPage } from "@/pages/quests";
import { QuestDetailPage } from "@/pages/quest-detail";
import { SellersPage } from "@/pages/sellers";
import { SellerDetailPage } from "@/pages/seller-detail";
import { ChatPage } from "@/pages/chat";

export function App() {
	return (
		<BrowserRouter>
			<AuthProvider>
				<Routes>
					<Route path="/login" element={<LoginPage />} />
					<Route
						element={
							<ProtectedRoute>
								<Layout />
							</ProtectedRoute>
						}
					>
						<Route index element={<DashboardPage />} />
						<Route path="chat" element={<ChatPage />} />
						<Route path="listings" element={<ListingsPage />} />
						<Route path="listings/:id" element={<ListingDetailPage />} />
						<Route path="sellers" element={<SellersPage />} />
						<Route path="sellers/:id" element={<SellerDetailPage />} />
						<Route path="quests" element={<QuestsPage />} />
						<Route path="quests/:id" element={<QuestDetailPage />} />
						<Route path="scraping-tasks" element={<ScrapingTasksPage />} />
						<Route path="scraper" element={<ScraperPage />} />
					</Route>
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</AuthProvider>
		</BrowserRouter>
	);
}
