import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";
import { Layout } from "@/components/layout";
import { LoginPage } from "@/pages/login";
import { DashboardPage } from "@/pages/dashboard";
import { ListingsPage } from "@/pages/listings";
import { ListingDetailPage } from "@/pages/listing-detail";
import { TriggersPage } from "@/pages/triggers";
import { ScraperPage } from "@/pages/scraper";

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
						<Route path="listings" element={<ListingsPage />} />
						<Route path="listings/:id" element={<ListingDetailPage />} />
						<Route path="triggers" element={<TriggersPage />} />
						<Route path="scraper" element={<ScraperPage />} />
					</Route>
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</AuthProvider>
		</BrowserRouter>
	);
}
