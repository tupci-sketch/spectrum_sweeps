import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { drawPots, potEntries, assignments, competitions, participants, drawAuditLog } from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";
import { z } from "zod";
import type { Bindings } from "./bindings";
import { getDb } from "./db";
import { countActiveParticipants } from "./competition-helpers";
import { generateSeed, seededShuffle, toHex, commitHash } from "../draw/engine";

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

const runDrawSchema = z.object({
  competitionId: z.string(),
  drawnBy: z.string(),
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
  .get("/entries", async (c) => {
    const db = getDb(c.env);
    const competitionId = c.req.query("competitionId");
    if (!competitionId) return c.json({ error: "competitionId query param required" }, 400);
    const pots = await db.select().from(drawPots).where(eq(drawPots.competitionId, competitionId)).all();
    const entries = (
      await Promise.all(pots.map((p) => db.select().from(potEntries).where(eq(potEntries.drawPotId, p.id)).all()))
    ).flat();
    return c.json(entries);
  })
  .post("/entries", async (c) => {
    const body = createEntrySchema.parse(await c.req.json());
    const db = getDb(c.env);
    const row = { id: newId("entry"), isDrawn: false, ...body };
    await db.insert(potEntries).values(row).run();
    return c.json(row, 201);
  })
  .get("/assignments", async (c) => {
    const db = getDb(c.env);
    const competitionId = c.req.query("competitionId");
    if (!competitionId) return c.json({ error: "competitionId query param required" }, 400);
    return c.json(
      await db.select().from(assignments).where(eq(assignments.competitionId, competitionId)).all(),
    );
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
  })
  // The one-click "run the draw" — this is how the sweepstake is actually held:
  // once entries are full and every participant is in, a single random draw
  // assigns each participant a team/driver. Gated on the competition being
  // exactly full; refuses to re-draw a competition that already has assignments.
  .post("/run", async (c) => {
    const body = runDrawSchema.parse(await c.req.json());
    const db = getDb(c.env);

    const [competition] = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, body.competitionId))
      .all();
    if (!competition) return c.json({ error: "competition not found" }, 404);

    // Refuse to draw twice — assignments are the immutable record of the draw.
    const existing = await db
      .select()
      .from(assignments)
      .where(eq(assignments.competitionId, body.competitionId))
      .all();
    if (existing.length > 0) {
      return c.json({ error: "draw already completed for this competition" }, 409);
    }

    const activeParticipants = await db
      .select()
      .from(participants)
      .where(and(eq(participants.competitionId, body.competitionId), eq(participants.entryStatus, "active")))
      .all();
    const activeCount = await countActiveParticipants(db, body.competitionId);

    // Capacity gate: the draw is only held once the field is exactly full.
    if (activeCount !== competition.targetEntryCount) {
      return c.json(
        {
          error: "competition is not full — the draw runs only when entries match the target",
          activeParticipants: activeCount,
          targetEntryCount: competition.targetEntryCount,
        },
        409,
      );
    }

    // Draw pool: every undrawn pot entry across the competition's pots.
    const pots = await db.select().from(drawPots).where(eq(drawPots.competitionId, body.competitionId)).all();
    const potIds = new Set(pots.map((p) => p.id));
    const allEntries = (
      await Promise.all(pots.map((p) => db.select().from(potEntries).where(eq(potEntries.drawPotId, p.id)).all()))
    ).flat();
    const availableEntries = allEntries.filter((e) => !e.isDrawn);

    if (availableEntries.length < activeParticipants.length) {
      return c.json(
        {
          error: "not enough teams/drivers in the draw pots for every participant",
          availableEntries: availableEntries.length,
          participants: activeParticipants.length,
        },
        409,
      );
    }

    // Pre-commit: fix the shuffle, then write the commit hash to the audit log
    // BEFORE creating assignments — proving the outcome was set in advance.
    const seed = generateSeed();
    const seedHex = toHex(seed);
    const shuffledEntries = seededShuffle(availableEntries, seed);
    const drawnPairs = activeParticipants.map((participant, i) => ({
      participant,
      entry: shuffledEntries[i],
    }));
    const timestampMs = Date.now();
    const hash = await commitHash(
      seedHex,
      drawnPairs.map((p) => p.entry.id),
      timestampMs,
    );

    await db.insert(drawAuditLog).values({
      id: newId("audit"),
      competitionId: body.competitionId,
      eventType: "draw_committed",
      payload: { algorithm: "seeded-fisher-yates-v1", commitHash: hash, timestampMs },
      actorUserId: body.drawnBy,
    }).run();

    // Create assignments + mark entries drawn.
    const assignmentRows = drawnPairs.map(({ participant, entry }) => ({
      id: newId("asn"),
      competitionId: body.competitionId,
      participantId: participant.id,
      drawPotId: potIds.has(entry.drawPotId) ? entry.drawPotId : null,
      potEntryId: entry.id,
      drawnBy: body.drawnBy,
      revealMode: "standard" as const,
    }));
    await db.insert(assignments).values(assignmentRows).run();
    for (const { entry } of drawnPairs) {
      await db.update(potEntries).set({ isDrawn: true }).where(eq(potEntries.id, entry.id)).run();
    }

    // Completion: publish the seed so the commit hash can be re-derived and
    // verified, and move the competition into its active (season-running) state.
    await db.insert(drawAuditLog).values({
      id: newId("audit"),
      competitionId: body.competitionId,
      eventType: "draw_completed",
      payload: { seedHex, commitHash: hash, assignmentCount: assignmentRows.length },
      actorUserId: body.drawnBy,
    }).run();
    await db.update(competitions).set({ status: "active" }).where(eq(competitions.id, body.competitionId)).run();

    return c.json({
      competitionId: body.competitionId,
      assignments: assignmentRows.map((a) => ({ participantId: a.participantId, potEntryId: a.potEntryId })),
      commitHash: hash,
    }, 201);
  });
