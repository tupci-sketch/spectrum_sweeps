import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { accountTypes, users, capabilityKeys } from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";
import { z } from "zod";
import type { AppEnv } from "./bindings";
import { getDb } from "./db";
import { requireCapability } from "../auth/middleware";

const permsShape = z.record(z.enum(capabilityKeys), z.boolean());
const createSchema = z.object({ name: z.string().min(2).max(40), level: z.number().int().min(1).max(7), permissions: permsShape });
const updateSchema = z.object({ level: z.number().int().min(1).max(7).optional(), permissions: permsShape.optional() });
const assignSchema = z.object({ accountType: z.string(), level: z.number().int().min(1).max(7) });

// Editable roles/permissions — owner-only (manageRoles capability).
export const rolesApi = new Hono<AppEnv>()
  .get("/", requireCapability("manageRoles"), async (c) => {
    const db = getDb(c.env);
    return c.json(await db.select().from(accountTypes).orderBy(accountTypes.level).all());
  })
  .post("/", requireCapability("manageRoles"), async (c) => {
    const body = createSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const row = { id: newId("at"), name: body.name.toLowerCase(), level: body.level, permissions: body.permissions, isSystem: false };
    await db.insert(accountTypes).values(row).run();
    return c.json(row, 201);
  })
  .patch("/:id", requireCapability("manageRoles"), async (c) => {
    const body = updateSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const patch: Record<string, unknown> = {};
    if (body.level != null) patch.level = body.level;
    if (body.permissions) patch.permissions = body.permissions;
    await db.update(accountTypes).set(patch).where(eq(accountTypes.id, c.req.param("id"))).run();
    return c.json({ ok: true });
  })
  .delete("/:id", requireCapability("manageRoles"), async (c) => {
    const db = getDb(c.env);
    const [row] = await db.select().from(accountTypes).where(eq(accountTypes.id, c.req.param("id"))).all();
    if (row?.isSystem) return c.json({ error: "system roles can't be deleted" }, 400);
    await db.delete(accountTypes).where(eq(accountTypes.id, c.req.param("id"))).run();
    return c.json({ ok: true });
  })
  // Assign a user to a role (sets account type + level together).
  .patch("/users/:userId", requireCapability("manageRoles"), async (c) => {
    const body = assignSchema.parse(await c.req.json());
    const db = getDb(c.env);
    // Keep the coarse role enum roughly in step for legacy checks.
    const legacyRole = body.level >= 6 ? "admin" : body.level >= 5 ? "organiser" : body.level >= 4 ? "moderator" : "participant";
    await db
      .update(users)
      .set({ accountType: body.accountType, level: body.level, role: legacyRole as typeof users.$inferSelect.role })
      .where(eq(users.id, c.req.param("userId")))
      .run();
    return c.json({ ok: true });
  });
