import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import {
  competitions,
  participants,
  drawPots,
  potEntries,
  assignments,
  drawAuditLog,
  users,
} from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";
import { z } from "zod";
import type { AppEnv } from "./bindings";
import { getDb } from "./db";
import { requireLevel } from "../auth/middleware";
import { generateSeed, seededShuffle, toHex, fromHex, commitHash } from "../draw/engine";

// The scheduled live draw. A full competition is scheduled for a time; at that
// time everyone opens the draw room and an L7 admin reveals one allocation per
// "spin". The order is fixed up-front by a committed seed (provably fair), then
// revealed sequentially — watchers poll /state and see each pick appear in sync.

const scheduleSchema = z.object({ scheduledAt: z.coerce.date() });
const startSchema = z.object({ competitionId: z.string() });
const spinSchema = z.object({ competitionId: z.string() });

// Deterministic reveal plan from the stored seed: participants in a stable
// order paired with the seed-shuffled entries. Recomputed each spin so no
// intermediate ordering needs persisting.
async function revealPlan(db: ReturnType<typeof getDb>, competitionId: string, seedHex: string) {
  const parts = await db
    .select()
    .from(participants)
    .where(and(eq(participants.competitionId, competitionId), eq(participants.entryStatus, "active")))
    .all();
  parts.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime() || a.id.localeCompare(b.id));

  const pots = await db.select().from(drawPots).where(eq(drawPots.competitionId, competitionId)).all();
  const entries = (
    await Promise.all(pots.map((p) => db.select().from(potEntries).where(eq(potEntries.drawPotId, p.id)).all()))
  ).flat();
  entries.sort((a, b) => a.id.localeCompare(b.id));
  const shuffled = seededShuffle(entries, fromHex(seedHex));

  return parts.map((participant, i) => ({ participant, entry: shuffled[i] }));
}

export const drawLiveApi = new Hono<AppEnv>()
  // Schedule the draw for a date/time (L5+). Competition should be full first.
  .post("/competitions/:id/schedule", requireLevel(5), async (c) => {
    const { scheduledAt } = scheduleSchema.parse(await c.req.json());
    const db = getDb(c.env);
    await db
      .update(competitions)
      .set({ drawScheduledAt: scheduledAt, drawState: "scheduled" })
      .where(eq(competitions.id, c.req.param("id")))
      .run();
    return c.json({ id: c.req.param("id"), drawScheduledAt: scheduledAt, drawState: "scheduled" });
  })
  // Begin the live draw — fixes the random order and commits its hash before
  // any reveal. Owner-only (L7): "only L7 can run the spin".
  .post("/start", requireLevel(7), async (c) => {
    const { competitionId } = startSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const actor = c.get("user")!;

    const [comp] = await db.select().from(competitions).where(eq(competitions.id, competitionId)).all();
    if (!comp) return c.json({ error: "competition not found" }, 404);
    if (comp.drawState === "live" || comp.drawState === "completed") {
      return c.json({ error: "draw already started" }, 409);
    }
    const existing = await db.select().from(assignments).where(eq(assignments.competitionId, competitionId)).all();
    if (existing.length > 0) return c.json({ error: "draw already has assignments" }, 409);

    const plan = await (async () => {
      const seed = generateSeed();
      const seedHex = toHex(seed);
      const p = await revealPlan(db, competitionId, seedHex);
      return { seedHex, p };
    })();

    if (plan.p.length === 0 || plan.p.some((x) => !x.entry)) {
      return c.json({ error: "need at least as many teams/drivers as participants before starting" }, 409);
    }

    const hash = await commitHash(plan.seedHex, plan.p.map((x) => x.entry.id), Date.now());
    await db.insert(drawAuditLog).values({
      id: newId("audit"),
      competitionId,
      eventType: "draw_committed",
      payload: { algorithm: "seeded-fisher-yates-v1", commitHash: hash, revealMode: "live" },
      actorUserId: actor.id,
    }).run();

    await db
      .update(competitions)
      .set({ drawState: "live", drawSeed: plan.seedHex, drawStartedByUserId: actor.id, status: "draw_pending" })
      .where(eq(competitions.id, competitionId))
      .run();

    return c.json({ ok: true, total: plan.p.length, commitHash: hash });
  })
  // Reveal the next allocation (L7). Idempotent-ish: reveals plan[revealedCount].
  .post("/spin", requireLevel(7), async (c) => {
    const { competitionId } = spinSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const actor = c.get("user")!;

    const [comp] = await db.select().from(competitions).where(eq(competitions.id, competitionId)).all();
    if (!comp) return c.json({ error: "competition not found" }, 404);
    if (comp.drawState !== "live" || !comp.drawSeed) return c.json({ error: "draw is not live" }, 409);

    const plan = await revealPlan(db, competitionId, comp.drawSeed);
    const already = await db.select().from(assignments).where(eq(assignments.competitionId, competitionId)).all();
    const idx = already.length;
    if (idx >= plan.length) return c.json({ error: "draw already complete" }, 409);

    const { participant, entry } = plan[idx];
    const row = {
      id: newId("asn"),
      competitionId,
      participantId: participant.id,
      drawPotId: entry.drawPotId,
      potEntryId: entry.id,
      drawnBy: actor.id,
      revealMode: "standard" as const,
    };
    await db.insert(assignments).values(row).run();
    await db.update(potEntries).set({ isDrawn: true }).where(eq(potEntries.id, entry.id)).run();

    const isLast = idx + 1 >= plan.length;
    if (isLast) {
      await db.insert(drawAuditLog).values({
        id: newId("audit"),
        competitionId,
        eventType: "draw_completed",
        payload: { seedHex: comp.drawSeed, assignmentCount: plan.length },
        actorUserId: actor.id,
      }).run();
      await db
        .update(competitions)
        .set({ drawState: "completed", status: "active" })
        .where(eq(competitions.id, competitionId))
        .run();
    }

    const [u] = await db.select().from(users).where(eq(users.id, participant.userId)).all();
    return c.json({
      revealed: idx + 1,
      total: plan.length,
      complete: isLast,
      pick: { nickname: u?.nickname ?? "Player", team: entry.teamOrDriverLabel, participantId: participant.id },
    });
  })
  // Public live state — the draw room polls this to render reveals in sync.
  .get("/:competitionId/state", async (c) => {
    const db = getDb(c.env);
    const competitionId = c.req.param("competitionId");
    const [comp] = await db.select().from(competitions).where(eq(competitions.id, competitionId)).all();
    if (!comp) return c.json({ error: "not found" }, 404);

    const parts = await db
      .select()
      .from(participants)
      .where(and(eq(participants.competitionId, competitionId), eq(participants.entryStatus, "active")))
      .all();
    const allUsers = await db.select().from(users).all();
    const nick = new Map(allUsers.map((u) => [u.id, u.nickname]));

    const pots = await db.select().from(drawPots).where(eq(drawPots.competitionId, competitionId)).all();
    const entries = (
      await Promise.all(pots.map((p) => db.select().from(potEntries).where(eq(potEntries.drawPotId, p.id)).all()))
    ).flat();
    const entryLabel = new Map(entries.map((e) => [e.id, e.teamOrDriverLabel]));

    const asn = await db.select().from(assignments).where(eq(assignments.competitionId, competitionId)).all();
    // Reveal order is assignment insertion order (each spin appends one).
    const reveals = asn.map((a) => ({
      participantId: a.participantId,
      nickname: nick.get(parts.find((p) => p.id === a.participantId)?.userId ?? "") ?? "Player",
      team: entryLabel.get(a.potEntryId) ?? "—",
    }));

    return c.json({
      competition: {
        id: comp.id,
        name: comp.name,
        formatType: comp.formatType,
        drawState: comp.drawState,
        drawScheduledAt: comp.drawScheduledAt,
      },
      totalParticipants: parts.length,
      revealedCount: asn.length,
      complete: comp.drawState === "completed",
      reveals,
    });
  });
