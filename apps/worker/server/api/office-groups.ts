import { Hono } from "hono";
import { officeGroups } from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";
import { z } from "zod";
import type { Bindings } from "./bindings";
import { getDb } from "./db";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const officeGroupsApi = new Hono<{ Bindings: Bindings }>()
  .get("/", async (c) => {
    const db = getDb(c.env);
    return c.json(await db.select().from(officeGroups).all());
  })
  .post("/", async (c) => {
    const body = createSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const row = { id: newId("og"), ...body };
    await db.insert(officeGroups).values(row).run();
    return c.json(row, 201);
  });
