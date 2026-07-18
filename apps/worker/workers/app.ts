import { api } from "../server/api";
import type { Bindings } from "../server/api/bindings";

// API-only Worker: the static frontend is served from GitHub Pages and calls
// this Worker cross-origin. Hono (mounted at /api via basePath) owns every
// route here; CORS is configured in server/api/index.ts.
export default {
  async fetch(request, env, ctx) {
    return api.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Bindings>;
