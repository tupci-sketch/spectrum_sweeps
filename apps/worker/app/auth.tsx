import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { API_BASE, apiPost, clearToken, getToken, setToken } from "./api-client";

export interface Me {
  id: string;
  nickname: string;
  displayName: string;
  email?: string;
  role: string;
  level: number;
  accountType: string;
  avatarUrl?: string | null;
  bio?: string | null;
}

interface AuthState {
  user: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { nickname: string; email: string; password: string; code?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = (await res.json()) as { user: Me | null };
        setUser(data.user);
        if (!data.user) clearToken();
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const data = await apiPost<{ token: string; user: Me }>("/api/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
  }

  async function register(input: { nickname: string; email: string; password: string; code?: string }) {
    const data = await apiPost<{ token: string; user: Me }>("/api/auth/register", input);
    setToken(data.token);
    setUser(data.user);
  }

  async function logout() {
    try {
      await apiPost("/api/auth/logout");
    } catch {
      /* ignore network errors on logout */
    }
    clearToken();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
