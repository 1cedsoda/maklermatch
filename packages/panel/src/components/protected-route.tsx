import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
	const { isAuthenticated } = useAuth();
	if (!isAuthenticated) return <Navigate to="/login" replace />;
	return children;
}
