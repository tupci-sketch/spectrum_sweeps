import { Hono } from "hono";
import { scoreEvents, scoreEventTypeValues } from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";
import { z } from "zod";
import type { Bindings } from "./bindings";
import { getDb } from "./db";
import { recomputeAndStoreStandings } from "./leaderboard";

const createSchema = z.object({
  competitionId: z.string(),
  subjectRef: z.string(),
  eventType: z.enum(scoreEventTypeValues),
  payload: z.record(z.string(), z.unknown()),
  recordedBy: z.string(),
});

export const resultsApi = new Hono<{ Bindings: Bindings }>().post("/", async (c) => {
  const body = createSchema.parse(await c.req.json());
  const db = getDb(c.env);
  const row = { id: newId("evt"), source: "manual" as const, ...body };
  await db.insert(scoreEvents).values(row).run();

  // Phase 1: recompute the leaderboard synchronously on every result entry.
  // Fine at office-tournament volume; revisit only if entry latency becomes noticeable.
  const snapshot = await recomputeAndStoreStandings(db, body.competitionId);

  return c.json({ event: row, snapshot }, 201);
});
