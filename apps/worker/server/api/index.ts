import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Bindings } from "./bindings";
import { officeGroupsApi } from "./office-groups";
import { leaguesApi } from "./leagues";
import { sportsApi } from "./sports";
import { competitionsApi } from "./competitions";
import { participantsApi } from "./participants";
import { drawApi } from "./draw";
import { resultsApi } from "./results";
import { leaderboardApi } from "./leaderboard";

// Mounted under /api by workers/app.ts. Everything under /admin/* is expected
// to already be gated by Cloudflare Access at the edge (phase 1) — no
// app-level auth middleware here yet (see plan doc, phase 2 introduces
// participant-facing magic-link auth + KV sessions).
export const api = new Hono<{ Bindings: Bindings }>()
  .basePath("/api")
  // The static frontend (GitHub Pages, later spectrum-sweeps.co.uk) calls this
  // Worker cross-origin. No cookies/credentials yet (phase 1 admin sits behind
  // Cloudflare Access), so a reflected-origin allowlist is enough; tighten to a
  // fixed origin list once participant auth lands.
  .use(
    "*",
    cors({
      origin: (origin) => origin ?? "*",
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    }),
  )
  .route("/admin/office-groups", officeGroupsApi)
  .route("/admin/leagues", leaguesApi)
  .route("/admin/sports", sportsApi)
  .route("/admin/competitions", competitionsApi)
  .route("/admin/participants", participantsApi)
  .route("/admin/draw", drawApi)
  .route("/admin/results", resultsApi)
  .route("/leaderboard", leaderboardApi);

export type ApiType = typeof api;
