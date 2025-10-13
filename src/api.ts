export const API_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:4000/api";

type JSONLike = Record<string, any> | any[] | null;

// Small helper to build URL safely
function joinUrl(base: string, path: string) {
  if (/^https?:\/\//i.test(path)) return path; // already absolute
  const b = base.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export async function request<T = JSONLike>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = joinUrl(API_URL, path);
  let res: Response;

  try {
    res = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (e) {
    throw new Error("Network error. Is the API running on 4000?");
  }

  // 204 No Content
  if (res.status === 204) return null as T;

  const ct = res.headers.get("content-type") || "";
  let body: any = null;

  if (ct.includes("application/json")) {
    // JSON response
    try {
      body = await res.json();
    } catch {
      body = null;
    }
  } else {
    // Non‑JSON (e.g., HTML from Vite index.html)
    body = await res.text();
  }

  if (!res.ok) {
    // Build a safe error message
    const msg =
      typeof body === "string"
        ? (body.trim().startsWith("<") // got HTML (likely wrong origin/proxy)
            ? `HTTP ${res.status} ${res.statusText}`
            : body)
        : body?.message || res.statusText;
    throw new Error(msg);
  }

  // If server returned text but not JSON, try to parse or return as string
  if (typeof body === "string" && !ct.includes("application/json")) {
    try {
      return JSON.parse(body) as T;
    } catch {
      // return plain text if not JSON
      return body as T;
    }
  }

  return body as T;
}

// ---------------- API methods ----------------
export const api = {
  // auth
  me: () => request("/auth/me"),
  login: (email: string, password: string) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request("/auth/logout", { method: "POST" }),

  // budgets
  getBudgets: () => request("/budgets"),
  createBudget: (category: string, limit: number) =>
    request("/budgets", { method: "POST", body: JSON.stringify({ category, limit }) }),
  updateBudget: (id: number, data: any) =>
    request(`/budgets/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteBudget: (id: number) => request(`/budgets/${id}`, { method: "DELETE" }),

  // expenses
  getExpenses: () => request("/expenses"),
  createExpense: (payload: { date: string; category: string; description?: string; amount: number }) =>
    request("/expenses", { method: "POST", body: JSON.stringify(payload) }),
  updateExpense: (id: number, payload: any) =>
    request(`/expenses/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteExpense: (id: number) => request(`/expenses/${id}`, { method: "DELETE" }),

  // savings
  getSavings: () => request("/savings"),
  createSaving: (name: string, target: number) =>
    request("/savings", { method: "POST", body: JSON.stringify({ name, target }) }),
  updateSaving: (id: number, data: any) =>
    request(`/savings/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSaving: (id: number) => request(`/savings/${id}`, { method: "DELETE" }),

  // reports
  getReports: () => request("/reports"),
};
