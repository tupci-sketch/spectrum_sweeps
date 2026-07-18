import type { users } from "@spectrum-sweeps/db";

export interface Bindings {
  DB: D1Database;
}

export type AuthUser = typeof users.$inferSelect;

// Hono context variables set by the auth middleware.
export interface Variables {
  user: AuthUser | null;
}

export type AppEnv = { Bindings: Bindings; Variables: Variables };
