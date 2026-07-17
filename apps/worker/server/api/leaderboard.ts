import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import type { Db } from "@spectrum-sweeps/db";
import { assignments, competitions, scoreEvents, sports, standingsSnapshots } from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";
import type { Bindings } from "./bindings";
import { getDb } from "./db";
import { computeStandingsSnapshot } from "../scoring";

// Recomputes and stores a fresh standings_snapshots row for a competition.
// Called on every result entry (see results.ts) — leaderboard reads (below)
// only ever read the latest stored snapshot, never recompute live.
export async function recomputeAndStoreStandings(db: Db, competitionId: string) {
  const [competition] = await db.select().from(competitions).where(eq(competitions.id, competitionId)).all();
  if (!competition) throw new Error(`competition ${competitionId} not found`);

  const [sport] = await db.select().from(sports).where(eq(sports.id, competition.sportId)).all();
  if (!sport) throw new Error(`sport ${competition.sportId} not found`);

  const competitionAssignments = await db
    .select()
    .from(assignments)
    .where(eq(assignments.competitionId, competitionId))
    .all();
  const competitionScoreEvents = await db
    .select()
    .from(scoreEvents)
    .where(eq(scoreEvents.competitionId, competitionId))
    .all();

  const snapshot = computeStandingsSnapshot(competition.formatType, {
    scoringConfig: sport.scoringConfig,
    assignments: competitionAssignments.map((a) => ({ participantId: a.participantId, potEntryId: a.potEntryId })),
    scoreEvents: competitionScoreEvents.map((e) => ({
      subjectRef: e.subjectRef,
      eventType: e.eventType,
      payload: e.payload,
      recordedAt: e.recordedAt.getTime(),
    })),
  });

  const row = {
    id: newId("snap"),
    competitionId,
    // Set explicitly (not left to the column's SQL default) so ordering by
    // computedAt reliably picks the latest snapshot even when several
    // recomputes land within the same second.
    computedAt: new Date(),
    formatType: competition.formatType,
    snapshot: snapshot as unknown as Record<string, unknown>,
    isFinal: competition.status === "completed",
  };
  await db.insert(standingsSnapshots).values(row).run();
  return row;
}

export const leaderboardApi = new Hono<{ Bindings: Bindings }>().get("/:competitionId", async (c) => {
  const db = getDb(c.env);
  const [latest] = await db
    .select()
    .from(standingsSnapshots)
    .where(eq(standingsSnapshots.competitionId, c.req.param("competitionId")))
    .orderBy(desc(standingsSnapshots.computedAt))
    .limit(1)
    .all();

  if (!latest) return c.json({ error: "no standings yet for this competition" }, 404);
  return c.json(latest);
});
