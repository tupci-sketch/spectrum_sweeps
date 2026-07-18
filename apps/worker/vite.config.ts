import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// Builds the static SPA frontend only. The Cloudflare Worker API is a separate
// build target deployed via `wrangler deploy` (workers/app.ts), so the
// Cloudflare Vite plugin is intentionally not used here.
export default defineConfig({
  base: process.env.PAGES_BASE ?? "/",
  plugins: [tailwindcss(), reactRouter()],
});
