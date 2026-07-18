import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { competitions, sports } from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";
import { z } from "zod";
import type { Bindings } from "./bindings";
import { getDb } from "./db";

const createSchema = z.object({
  leagueId: z.string(),
  sportId: z.string(),
  name: z.string().min(1),
  seasonStart: z.coerce.date(),
  seasonEnd: z.coerce.date(),
  targetEntryCount: z.number().int().positive(),
});

function generateJoinCode() {
  return crypto.randomUUID().slice(0, 8).toUpperCase();
}

export const competitionsApi = new Hono<{ Bindings: Bindings }>()
  .get("/", async (c) => {
    const db = getDb(c.env);
    return c.json(await db.select().from(competitions).all());
  })
  .get("/:id", async (c) => {
    const db = getDb(c.env);
    const [row] = await db.select().from(competitions).where(eq(competitions.id, c.req.param("id"))).all();
    if (!row) return c.json({ error: "not found" }, 404);
    return c.json(row);
  })
  .post("/", async (c) => {
    const body = createSchema.parse(await c.req.json());
    const db = getDb(c.env);

    const [sport] = await db.select().from(sports).where(eq(sports.id, body.sportId)).all();
    if (!sport) return c.json({ error: "sport not found" }, 404);

    // formatType is copied from the sport at creation time and never re-read
    // from sports — editing a sport's format_type later must not retroactively
    // change how an already-running competition scores.
    const row = {
      id: newId("cmp"),
      leagueId: body.leagueId,
      sportId: body.sportId,
      name: body.name,
      formatType: sport.formatType,
      seasonStart: body.seasonStart,
      seasonEnd: body.seasonEnd,
      targetEntryCount: body.targetEntryCount,
      status: "draft" as const,
      joinCode: generateJoinCode(),
    };
    await db.insert(competitions).values(row).run();
    return c.json(row, 201);
  });
