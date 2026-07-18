import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { users, userRoleValues } from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";
import { z } from "zod";
import type { Bindings } from "./bindings";
import { getDb } from "./db";

const createSchema = z.object({
  email: z.string().email(),
  nickname: z.string().min(1),
  displayName: z.string().min(1).optional(),
  role: z.enum(userRoleValues).optional(),
  officeGroupId: z.string().optional(),
});

export const usersApi = new Hono<{ Bindings: Bindings }>()
  .get("/", async (c) => {
    const db = getDb(c.env);
    return c.json(await db.select().from(users).all());
  })
  // Find-or-create by email — lets the admin add a participant by just typing a
  // name + email without a separate user-management step; re-adding the same
  // email returns the existing user rather than erroring on the unique index.
  .post("/", async (c) => {
    const body = createSchema.parse(await c.req.json());
    const db = getDb(c.env);

    const [existing] = await db.select().from(users).where(eq(users.email, body.email)).all();
    if (existing) return c.json(existing);

    const row = {
      id: newId("user"),
      email: body.email,
      nickname: body.nickname,
      displayName: body.displayName ?? body.nickname,
      role: body.role ?? ("participant" as const),
      officeGroupId: body.officeGroupId ?? null,
      status: "active" as const,
    };
    await db.insert(users).values(row).run();
    return c.json(row, 201);
  });
