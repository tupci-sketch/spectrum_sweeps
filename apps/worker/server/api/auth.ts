import { Hono } from "hono";
import { and, eq, isNull, count } from "drizzle-orm";
import { users, inviteCodes } from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";
import { z } from "zod";
import type { AppEnv, AuthUser } from "./bindings";
import { getDb } from "./db";
import { hashPassword, verifyPassword } from "../auth/password";
import { createSession, destroySession } from "../auth/session";

const registerSchema = z.object({
  nickname: z.string().min(2).max(40),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  code: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
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

    const [emailTaken] = await db.select().from(users).where(eq(users.email, body.email)).all();
    if (emailTaken) return c.json({ error: "an account with that email already exists" }, 409);

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

    const user = {
      id: newId("user"),
      email: body.email,
      nickname: body.nickname,
      displayName: body.nickname,
      role: role as AuthUser["role"],
      level,
      accountType,
      officeGroupId,
      passwordHash: await hashPassword(body.password),
      status: "active" as const,
    };
    await db.insert(users).values(user).run();

    if (redeemCodeId) {
      await db
        .update(inviteCodes)
        .set({ redeemedByUserId: user.id, redeemedAt: new Date() })
        .where(eq(inviteCodes.id, redeemCodeId))
        .run();
    }

    const token = await createSession(db, user.id);
    return c.json({ token, user: safeUser(user as AuthUser) }, 201);
  })
  .post("/login", async (c) => {
    const body = loginSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const [user] = await db.select().from(users).where(eq(users.email, body.email)).all();
    if (!user || !user.passwordHash || !(await verifyPassword(body.password, user.passwordHash))) {
      return c.json({ error: "incorrect email or password" }, 401);
    }
    if (user.status === "disabled") return c.json({ error: "account disabled" }, 403);
    const token = await createSession(db, user.id);
    return c.json({ token, user: safeUser(user) });
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
