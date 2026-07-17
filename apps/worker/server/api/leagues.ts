import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { leagues, leagueStatusValues } from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";
import { z } from "zod";
import type { Bindings } from "./bindings";
import { getDb } from "./db";

const createSchema = z.object({
  officeGroupId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  createdBy: z.string(),
});

const updateStatusSchema = z.object({
  status: z.enum(leagueStatusValues),
});

export const leaguesApi = new Hono<{ Bindings: Bindings }>()
  .get("/", async (c) => {
    const db = getDb(c.env);
    return c.json(await db.select().from(leagues).all());
  })
  .post("/", async (c) => {
    const body = createSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const row = { id: newId("lg"), status: "draft" as const, ...body };
    await db.insert(leagues).values(row).run();
    return c.json(row, 201);
  })
  .patch("/:id/status", async (c) => {
    const { status } = updateStatusSchema.parse(await c.req.json());
    const db = getDb(c.env);
    await db.update(leagues).set({ status }).where(eq(leagues.id, c.req.param("id"))).run();
    return c.json({ id: c.req.param("id"), status });
  });
