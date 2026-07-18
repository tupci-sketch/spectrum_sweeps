import { api } from "../server/api";
import { createDb } from "@spectrum-sweeps/db";
import { syncAllFplLeagues } from "../server/catalog/fpl";
import type { Bindings } from "../server/api/bindings";

// API-only Worker: the static frontend is served from GitHub Pages and calls
// this Worker cross-origin. Hono (mounted at /api via basePath) owns every
// route here; CORS is configured in server/api/index.ts.
export default {
  async fetch(request, env, ctx) {
    return api.fetch(request, env, ctx);
  },
  // Cron poller: keeps FPL-sourced catalog leagues in sync with the official
  // feed. It's a no-op until FPL publishes 2026/27 (season gate in the
  // importer), then pulls real fixtures pre-season and results as they land.
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      syncAllFplLeagues(createDb(env.DB))
        .then((r) => console.log("FPL sync:", JSON.stringify(r)))
        .catch((e) => console.error("FPL sync failed:", e)),
    );
  },
} satisfies ExportedHandler<Bindings>;
