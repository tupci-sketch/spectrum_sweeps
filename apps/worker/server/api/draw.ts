import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { drawPots, potEntries, assignments } from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";
import { z } from "zod";
import type { Bindings } from "./bindings";
import { getDb } from "./db";

// Phase 1 scope: plain manual CRUD against draw_pots/pot_entries/assignments,
// used for "manual participant/team entry" before the spin wheel exists.
// Phase 3 replaces *how* assignments get created (DrawSessionDO: crypto
// randomness, pre-committed hash, live WebSocket reveal, draw_audit_log) but
// reuses these exact tables — this file's create-pot/create-entry endpoints
// stay useful as-is; only assignment creation gets a second (DO-backed) path.

const createPotSchema = z.object({
  competitionId: z.string(),
  name: z.string().min(1),
  potType: z.enum(["open", "seeded"]).optional(),
});

const createEntrySchema = z.object({
  drawPotId: z.string(),
  teamOrDriverLabel: z.string().min(1),
  seedOrder: z.number().int().optional(),
});

const createAssignmentSchema = z.object({
  competitionId: z.string(),
  participantId: z.string(),
  potEntryId: z.string(),
  drawPotId: z.string().optional(),
  drawnBy: z.string(),
  revealMode: z.enum(["standard", "secret"]).optional(),
});

export const drawApi = new Hono<{ Bindings: Bindings }>()
  .get("/pots", async (c) => {
    const db = getDb(c.env);
    const competitionId = c.req.query("competitionId");
    if (!competitionId) return c.json({ error: "competitionId query param required" }, 400);
    return c.json(await db.select().from(drawPots).where(eq(drawPots.competitionId, competitionId)).all());
  })
  .post("/pots", async (c) => {
    const body = createPotSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const row = { id: newId("pot"), potType: "open" as const, ...body };
    await db.insert(drawPots).values(row).run();
    return c.json(row, 201);
  })
  .post("/entries", async (c) => {
    const body = createEntrySchema.parse(await c.req.json());
    const db = getDb(c.env);
    const row = { id: newId("entry"), isDrawn: false, ...body };
    await db.insert(potEntries).values(row).run();
    return c.json(row, 201);
  })
  .post("/assignments", async (c) => {
    const body = createAssignmentSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const row = { id: newId("asn"), revealMode: "standard" as const, ...body };
    await db.insert(assignments).values(row).run();
    await db
      .update(potEntries)
      .set({ isDrawn: true })
      .where(eq(potEntries.id, body.potEntryId))
      .run();
    return c.json(row, 201);
  });
