// Base URL of the Cloudflare Worker API. The frontend is a static SPA hosted
// on GitHub Pages, so it always calls the API cross-origin. Set at build time
// via VITE_API_BASE_URL (the Worker's URL); defaults to a local `wrangler dev`
// for development.
export const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Response(`API request failed: ${path}`, { status: res.status });
  }
  return res.json() as Promise<T>;
}
