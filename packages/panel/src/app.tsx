import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";
import { Layout } from "@/components/layout";
import { LoginPage } from "@/pages/login";
import { DashboardPage } from "@/pages/dashboard";
import { ListingsPage } from "@/pages/listings";
import { ListingDetailPage } from "@/pages/listing-detail";
import { ScrapingTasksPage } from "@/pages/scraping-tasks";
import { ScrapingTaskDetailPage } from "@/pages/scraping-task-detail";
import { ScraperPage } from "@/pages/scraper";
import { TargetsPage } from "@/pages/targets";
import { TargetDetailPage } from "@/pages/target-detail";
import { SellersPage } from "@/pages/sellers";
import { SellerDetailPage } from "@/pages/seller-detail";
import { ChatPage } from "@/pages/chat";
import { BrokersPage } from "@/pages/brokers";

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
						<Route path="targets" element={<TargetsPage />} />
						<Route path="targets/:id" element={<TargetDetailPage />} />
						<Route path="scraping-tasks" element={<ScrapingTasksPage />} />
						<Route
							path="scraping-tasks/:id"
							element={<ScrapingTaskDetailPage />}
						/>
						<Route path="scraper" element={<ScraperPage />} />
						<Route path="brokers" element={<BrokersPage />} />
					</Route>
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</AuthProvider>
		</BrowserRouter>
	);
}
