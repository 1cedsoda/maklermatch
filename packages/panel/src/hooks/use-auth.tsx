import { createContext, useContext, useState, type ReactNode } from "react";
import type { LoginRequest } from "@scraper/api-types";
import { api } from "@/lib/api";

interface AuthState {
	token: string | null;
	isAuthenticated: boolean;
	login: (credentials: LoginRequest) => Promise<void>;
	logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [token, setToken] = useState<string | null>(() =>
		localStorage.getItem("token"),
	);

	const login = async (credentials: LoginRequest) => {
		const res = await api.login(credentials);
		localStorage.setItem("token", res.token);
		setToken(res.token);
	};

	const logout = () => {
		localStorage.removeItem("token");
		setToken(null);
	};

	return (
		<AuthContext.Provider
			value={{ token, isAuthenticated: !!token, login, logout }}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
