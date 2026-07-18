import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./bindings";
import { authApi } from "./auth";
import { invitesApi } from "./invites";
import { usersApi } from "./users";
import { officeGroupsApi } from "./office-groups";
import { leaguesApi } from "./leagues";
import { sportsApi } from "./sports";
import { competitionsApi } from "./competitions";
import { participantsApi } from "./participants";
import { drawApi } from "./draw";
import { resultsApi } from "./results";
import { leaderboardApi } from "./leaderboard";
import { withUser, requireLevel } from "../auth/middleware";

export const api = new Hono<AppEnv>()
  .basePath("/api")
  // Static frontend calls cross-origin with a Bearer token (no cookies), so the
  // Authorization header must be allowed. Origin is reflected (specific, not *).
  .use(
    "*",
    cors({
      origin: (origin) => origin ?? "*",
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    }),
  )
  .use("*", withUser)
  // Reads under /admin/* stay public (the home + leaderboard pages need them);
  // every mutation requires an authenticated L5+ account (organiser/admin/owner).
  // Sensitive fields (email, password hash) are stripped from public reads in
  // the individual routers.
  .use("/admin/*", async (c, next) => {
    if (c.req.method !== "GET" && c.req.method !== "OPTIONS") {
      return requireLevel(5)(c, next);
    }
    await next();
  })
  .route("/auth", authApi)
  .route("/admin/invites", invitesApi)
  .route("/admin/users", usersApi)
  .route("/admin/office-groups", officeGroupsApi)
  .route("/admin/leagues", leaguesApi)
  .route("/admin/sports", sportsApi)
  .route("/admin/competitions", competitionsApi)
  .route("/admin/participants", participantsApi)
  .route("/admin/draw", drawApi)
  .route("/admin/results", resultsApi)
  .route("/leaderboard", leaderboardApi);

export type ApiType = typeof api;
