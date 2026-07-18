import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { competitions, sports, drawPots, potEntries, catalogTeams } from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";
import { z } from "zod";
import type { AppEnv } from "./bindings";
import { getDb } from "./db";

const createSchema = z.object({
  leagueId: z.string(),
  sportId: z.string(),
  name: z.string().min(1),
  seasonStart: z.coerce.date(),
  seasonEnd: z.coerce.date(),
  targetEntryCount: z.number().int().positive(),
  // Optional: populate the draw pool straight from a selectable catalog league.
  catalogLeagueId: z.string().optional(),
});

function generateJoinCode() {
  return crypto.randomUUID().slice(0, 8).toUpperCase();
}

export const competitionsApi = new Hono<AppEnv>()
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

    // Selectable league: copy the catalog's teams straight into a draw pool so
    // the organiser doesn't hand-type 20 names — carrying crest/number across.
    if (body.catalogLeagueId) {
      const teams = await db.select().from(catalogTeams).where(eq(catalogTeams.catalogLeagueId, body.catalogLeagueId)).all();
      if (teams.length > 0) {
        const potId = newId("pot");
        await db.insert(drawPots).values({ id: potId, competitionId: row.id, name: "Main pool", potType: "open" }).run();
        for (const t of teams) {
          await db.insert(potEntries).values({
            id: newId("entry"),
            drawPotId: potId,
            teamOrDriverLabel: t.name,
            crestUrl: t.crestUrl,
            competitorNumber: t.competitorNumber,
            externalRef: t.externalRef,
            isDrawn: false,
          }).run();
        }
      }
    }

    return c.json({ ...row, populatedFromCatalog: body.catalogLeagueId ?? null }, 201);
  });
