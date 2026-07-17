import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { participants } from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";
import { z } from "zod";
import type { Bindings } from "./bindings";
import { getDb } from "./db";

const createSchema = z.object({
  competitionId: z.string(),
  userId: z.string(),
  paid: z.boolean().optional(),
});

const markPaidSchema = z.object({
  paid: z.boolean(),
});

export const participantsApi = new Hono<{ Bindings: Bindings }>()
  .get("/", async (c) => {
    const db = getDb(c.env);
    const competitionId = c.req.query("competitionId");
    const query = db.select().from(participants);
    const rows = competitionId
      ? await query.where(eq(participants.competitionId, competitionId)).all()
      : await query.all();
    return c.json(rows);
  })
  .post("/", async (c) => {
    const body = createSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const row = {
      id: newId("prt"),
      competitionId: body.competitionId,
      userId: body.userId,
      paid: body.paid ?? false,
      entryStatus: "active" as const,
    };
    await db.insert(participants).values(row).run();
    return c.json(row, 201);
  })
  .patch("/:id/paid", async (c) => {
    const { paid } = markPaidSchema.parse(await c.req.json());
    const db = getDb(c.env);
    await db
      .update(participants)
      .set({ paid, paidAt: paid ? new Date() : null })
      .where(eq(participants.id, c.req.param("id")))
      .run();
    return c.json({ id: c.req.param("id"), paid });
  });
