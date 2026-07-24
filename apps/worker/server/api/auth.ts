import { Hono } from "hono";
import { and, eq, isNull, count } from "drizzle-orm";
import { users, inviteCodes } from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";
import { z } from "zod";
import type { AppEnv, AuthUser } from "./bindings";
import { getDb } from "./db";
import { hashPassword, verifyPassword } from "../auth/password";
import { createSession, destroySession } from "../auth/session";
import { firstNameOf, recomputeDisplayNames } from "./display-names";

const registerSchema = z.object({
  fullName: z.string().min(2).max(80),
  password: z.string().min(8).max(200),
  code: z.string().optional(),
});

const loginSchema = z.object({
  fullName: z.string().min(1),
  password: z.string(),
});

// Never leak the password hash to clients.
export function safeUser(u: AuthUser) {
  const { passwordHash: _omit, ...rest } = u;
  return rest;
}

export const authApi = new Hono<AppEnv>()
  .post("/register", async (c) => {
    const body = registerSchema.parse(await c.req.json());
    const db = getDb(c.env);

    const [{ value: userCount }] = await db.select({ value: count() }).from(users).all();
    const isFirstAccount = userCount === 0;

    let role = "participant";
    let level = 1;
    let accountType = "participant";
    let officeGroupId: string | null = null;
    let redeemCodeId: string | null = null;

    if (isFirstAccount) {
      // The very first registration becomes the site owner — no code needed.
      role = "admin";
      level = 7;
      accountType = "owner";
    } else {
      if (!body.code) return c.json({ error: "a signup code is required" }, 400);
      const [code] = await db
        .select()
        .from(inviteCodes)
        .where(and(eq(inviteCodes.code, body.code), eq(inviteCodes.purpose, "signup"), isNull(inviteCodes.redeemedByUserId)))
        .all();
      if (!code) return c.json({ error: "invalid or already-used signup code" }, 400);
      if (code.expiresAt && code.expiresAt.getTime() < Date.now()) {
        return c.json({ error: "signup code has expired" }, 400);
      }
      role = code.role;
      level = code.grantLevel;
      accountType = code.accountType;
      officeGroupId = code.officeGroupId;
      redeemCodeId = code.id;
    }

    const first = firstNameOf(body.fullName);
    const userId = newId("user");
    await db.insert(users).values({
      id: userId,
      fullName: body.fullName.trim(),
      email: null,
      nickname: first,
      displayName: first,
      role: role as AuthUser["role"],
      level,
      accountType,
      officeGroupId,
      passwordHash: await hashPassword(body.password),
      status: "active" as const,
    }).run();

    if (redeemCodeId) {
      await db
        .update(inviteCodes)
        .set({ redeemedByUserId: userId, redeemedAt: new Date() })
        .where(eq(inviteCodes.id, redeemCodeId))
        .run();
    }

    // Add last initials where first names now collide, then return the fresh row.
    await recomputeDisplayNames(db);
    const [user] = await db.select().from(users).where(eq(users.id, userId)).all();

    const token = await createSession(db, userId);
    return c.json({ token, user: safeUser(user) }, 201);
  })
  .post("/login", async (c) => {
    const body = loginSchema.parse(await c.req.json());
    const db = getDb(c.env);
    // No email login — match on full name (or the derived display handle), and
    // let the password disambiguate if two people share a name.
    const name = body.fullName.trim().toLowerCase();
    const candidates = (await db.select().from(users).all()).filter(
      (u) => (u.fullName?.toLowerCase() === name) || u.nickname.toLowerCase() === name,
    );
    let matched: (typeof candidates)[number] | undefined;
    for (const u of candidates) {
      if (u.passwordHash && (await verifyPassword(body.password, u.passwordHash))) { matched = u; break; }
    }
    if (!matched) return c.json({ error: "incorrect name or password" }, 401);
    if (matched.status === "disabled") return c.json({ error: "account disabled" }, 403);
    const token = await createSession(db, matched.id);
    return c.json({ token, user: safeUser(matched) });
  })
  .post("/logout", async (c) => {
    const header = c.req.header("Authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (token) await destroySession(getDb(c.env), token);
    return c.json({ ok: true });
  })
  // Whether any account exists yet — the register screen uses this to show the
  // "first account = owner" state and hide the code field.
  .get("/bootstrap", async (c) => {
    const db = getDb(c.env);
    const [{ value }] = await db.select({ value: count() }).from(users).all();
    return c.json({ hasOwner: value > 0 });
  })
  .get("/me", async (c) => {
    const user = c.get("user");
    return c.json({ user: user ? safeUser(user) : null });
  });
