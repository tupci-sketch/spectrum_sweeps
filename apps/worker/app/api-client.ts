// Base URL of the Cloudflare Worker API. The frontend is a static SPA hosted
// on GitHub Pages, so it always calls the API cross-origin. Set at build time
// via VITE_API_BASE_URL (the Worker's URL); defaults to a local `wrangler dev`
// for development.
export const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

// Bearer-token session (frontend and API are on different origins, so a token
// in the Authorization header is more reliable than cross-site cookies).
const TOKEN_KEY = "spectrum_token";

export function getToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(base: Record<string, string> = {}): Record<string, string> {
  const token = getToken();
  return token ? { ...base, Authorization: `Bearer ${token}` } : base;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Response(`API request failed: ${path}`, { status: res.status });
  }
  return res.json() as Promise<T>;
}

export interface ApiError {
  status: number;
  body: unknown;
}

// Returns parsed JSON on success; throws an ApiError carrying the parsed error
// body so admin forms can surface the API's message (e.g. "competition is full").
async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const parsed = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw { status: res.status, body: parsed } satisfies ApiError;
  }
  return parsed as T;
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return send<T>("POST", path, body);
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return send<T>("PATCH", path, body);
}

export function apiErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (err && typeof err === "object" && "body" in err) {
    const body = (err as ApiError).body;
    if (body && typeof body === "object" && "error" in body) {
      return String((body as { error: unknown }).error);
    }
  }
  return fallback;
}
