import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Navigate } from "react-router-dom";

// Types
export type User = { id: number; email: string } | null;

interface AuthContextValue {
  user: User;
  loading: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  register(email: string, password: string): Promise<void>;
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// API base URL (normalize trailing slash)
const raw = import.meta.env.VITE_API_URL ?? "";
const API_URL = raw.endsWith("/") ? raw.slice(0, -1) : raw;

// Small helper to GET JSON with credentials
async function getJSON<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const isJSON = (res.headers.get("content-type") || "").includes("application/json");

  let data: any = undefined;
  if (isJSON) {
    try { data = await res.json(); } catch { data = undefined; }
  }

  if (!res.ok) {
    const msg = data?.message || `${res.status} ${res.statusText || "Request failed"}`;
    throw new Error(msg);
  }
  return data as T;
}

// Unified POST with credentials
async function postJSON<T = any>(endpoint: string, body?: Record<string, unknown>): Promise<T> {
  const url = `${API_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJSON = (res.headers.get("content-type") || "").includes("application/json");
  let data: any = undefined;
  if (isJSON) {
    try { data = await res.json(); } catch { data = undefined; }
  }

  if (!res.ok) {
    const msg = data?.message || `${res.status} ${res.statusText || "Request failed"}`;
    throw new Error(msg);
  }
  return data as T;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          credentials: "include",
          signal: ctrl.signal,
        });

        if (!res.ok) {
          // 401 -> not logged in; don't treat as error
          if (res.status !== 401) throw new Error(`HTTP ${res.status}`);
          setUser(null);
        } else {
          const data = await res.json();
          setUser(data.user ?? null);
        }
      } catch (err) {
        if ((err as any)?.name !== "AbortError") {
          console.warn("Session check failed:", err);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, []);

  // Refresh user (call /auth/me)
  const refresh = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
      if (!res.ok) {
        if (res.status !== 401) throw new Error(`HTTP ${res.status}`);
        setUser(null);
      } else {
        const data = await res.json();
        setUser(data.user ?? null);
      }
    } catch (e) {
      console.warn("Refresh failed:", e);
      setUser(null);
    }
  };

  const login = async (email: string, password: string) => {
    const data = await postJSON<{ user?: User }>("/auth/login", { email, password });
    if (data?.user) setUser(data.user);
    else await refresh();
  };

  const register = async (email: string, password: string) => {
    const data = await postJSON<{ user?: User }>("/auth/register", { email, password });
    if (data?.user) setUser(data.user);
    else await refresh();
  };

  const logout = async () => {
    try {
      await postJSON("/auth/logout");
    } catch (err) {
      console.warn("Logout request failed:", err);
    } finally {
      setUser(null);
    }
  };

  const value: AuthContextValue = { user, loading, login, logout, register, refresh };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an <AuthProvider>");
  return ctx;
}

// Route guard for protected routes
export function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Optional: guard for /login (redirects logged-in users away)
export function RequireGuest({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading…
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;
  return children;
}