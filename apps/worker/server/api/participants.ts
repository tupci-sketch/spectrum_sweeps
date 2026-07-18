import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { participants, competitions } from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";
import { z } from "zod";
import type { Bindings } from "./bindings";
import { getDb } from "./db";
import { countActiveParticipants } from "./competition-helpers";

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

    const [competition] = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, body.competitionId))
      .all();
    if (!competition) return c.json({ error: "competition not found" }, 404);

    // Capacity gate: the sweepstake fills up to the season's team/driver count,
    // then the draw is held. Reject joins once full. (D1 has no server-side
    // transactions across statements, but at office scale this check-then-insert
    // is adequate; the draw/run endpoint re-validates fullness before drawing.)
    const activeCount = await countActiveParticipants(db, body.competitionId);
    if (activeCount >= competition.targetEntryCount) {
      return c.json(
        { error: "competition is full", targetEntryCount: competition.targetEntryCount },
        409,
      );
    }

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
