import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { accountTypes, type CapabilityKey } from "@spectrum-sweeps/db";
import type { AppEnv } from "../api/bindings";
import { getDb } from "../api/db";
import { resolveSession } from "./session";

// Attaches the authenticated user (or null) to the context from the
// Authorization: Bearer <token> header. Non-blocking — routes decide whether
// auth is required via requireAuth / requireLevel below.
export const withUser = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  c.set("user", token ? await resolveSession(getDb(c.env), token) : null);
  await next();
});

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get("user")) return c.json({ error: "authentication required" }, 401);
  await next();
});

// Gate on a minimum privilege level (L1–L7). Owner is L7.
export function requireLevel(minLevel: number) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "authentication required" }, 401);
    if (user.level < minLevel) return c.json({ error: "insufficient privileges" }, 403);
    await next();
  });
}

// Gate on an editable capability from the user's account type. An L7 owner
// always passes (safety net); otherwise the account type's permission flag
// decides. Falls back to level ≥ 7 if no account type row exists.
export function requireCapability(cap: CapabilityKey) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "authentication required" }, 401);
    if (user.level >= 7) return next();
    const [type] = await getDb(c.env)
      .select()
      .from(accountTypes)
      .where(eq(accountTypes.name, user.accountType))
      .all();
    const allowed = type ? type.permissions[cap] === true : false;
    if (!allowed) return c.json({ error: `your role can't ${cap}` }, 403);
    await next();
  });
}
