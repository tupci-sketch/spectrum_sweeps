import { Hono } from "hono";
import { eq } from "drizzle-orm";
import {
  competitions,
  leagues,
  sports,
  drawPots,
  potEntries,
  catalogLeagues,
  catalogTeams,
  officeGroups,
  formatTypeValues,
} from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";
import { z } from "zod";
import type { AppEnv } from "./bindings";
import { getDb } from "./db";
import { requireCapability } from "../auth/middleware";
import { deleteCompetitionCascade } from "./cascade";

// A "sweepstake" is the single user-facing thing: a named event people enter and
// get drawn a team/driver for. Under the hood it's still a competition inside a
// league, but the league is just an auto-managed folder per office group so the
// user never has to think about that split.

const createSchema = z
  .object({
    name: z.string().min(2).max(120),
    officeGroupId: z.string(),
    // Either build from a catalog event (auto-populates teams + format)…
    catalogLeagueId: z.string().optional(),
    // …or a custom event: pick the format + how many entries.
    formatType: z.enum(formatTypeValues).optional(),
    targetEntryCount: z.number().int().positive().max(200).optional(),
    seasonStart: z.coerce.date().optional(),
    seasonEnd: z.coerce.date().optional(),
    stake: z.string().max(120).optional(),
    prizePool: z.string().max(200).optional(),
  })
  .refine((v) => v.catalogLeagueId || v.formatType, {
    message: "pick an event from the catalog or choose a format for a custom one",
  });

function joinCode() {
  return crypto.randomUUID().slice(0, 8).toUpperCase();
}

// One league per office group acts as the invisible container. Reuse it if it
// already exists so groups don't accumulate duplicate "folders".
async function findOrCreateGroupLeague(
  db: ReturnType<typeof getDb>,
  officeGroupId: string,
  groupName: string,
  createdBy: string,
) {
  const [existing] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.officeGroupId, officeGroupId))
    .all();
  if (existing) return existing;
  const row = { id: newId("lg"), officeGroupId, name: groupName, status: "active" as const, createdBy };
  await db.insert(leagues).values(row).run();
  return { ...row } as typeof leagues.$inferSelect;
}

export const sweepstakesApi = new Hono<AppEnv>()
  // List sweepstakes = competitions, enriched with their group + stake/prize.
  .get("/", async (c) => {
    const db = getDb(c.env);
    const comps = await db.select().from(competitions).all();
    const allLeagues = await db.select().from(leagues).all();
    const groups = await db.select().from(officeGroups).all();
    const leagueById = new Map(allLeagues.map((l) => [l.id, l]));
    const groupById = new Map(groups.map((g) => [g.id, g]));
    return c.json(
      comps.map((comp) => {
        const lg = leagueById.get(comp.leagueId);
        const grp = lg ? groupById.get(lg.officeGroupId) : undefined;
        return {
          id: comp.id,
          name: comp.name,
          formatType: comp.formatType,
          status: comp.status,
          drawState: comp.drawState,
          targetEntryCount: comp.targetEntryCount,
          stake: comp.stake,
          prizePool: comp.prizePool,
          groupName: grp?.name ?? null,
          officeGroupId: lg?.officeGroupId ?? null,
        };
      }),
    );
  })
  .post("/", requireCapability("organise"), async (c) => {
    const body = createSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const actor = c.get("user")!;

    const [group] = await db.select().from(officeGroups).where(eq(officeGroups.id, body.officeGroupId)).all();
    if (!group) return c.json({ error: "office group not found" }, 404);

    // Resolve the event source: catalog (with teams) or custom format.
    let formatType = body.formatType;
    let targetEntryCount = body.targetEntryCount;
    let seasonStart = body.seasonStart;
    let seasonEnd = body.seasonEnd;
    let catalogTeamRows: (typeof catalogTeams.$inferSelect)[] = [];

    if (body.catalogLeagueId) {
      const [cat] = await db.select().from(catalogLeagues).where(eq(catalogLeagues.id, body.catalogLeagueId)).all();
      if (!cat) return c.json({ error: "catalog event not found" }, 404);
      catalogTeamRows = await db.select().from(catalogTeams).where(eq(catalogTeams.catalogLeagueId, cat.id)).all();
      formatType = cat.formatType;
      targetEntryCount = catalogTeamRows.length || targetEntryCount || 1;
      seasonStart = seasonStart ?? cat.seasonStart ?? new Date();
      seasonEnd = seasonEnd ?? cat.seasonEnd ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 270);
    }
    if (!formatType) return c.json({ error: "format is required" }, 400);
    if (!targetEntryCount) return c.json({ error: "target entry count is required" }, 400);
    seasonStart = seasonStart ?? new Date();
    seasonEnd = seasonEnd ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 270);

    // The sport row only supplies the scoring template for this format.
    const [sport] = await db.select().from(sports).where(eq(sports.formatType, formatType)).all();
    if (!sport) return c.json({ error: `no scoring template for format "${formatType}"` }, 400);

    const league = await findOrCreateGroupLeague(db, group.id, group.name, actor.id);

    const comp = {
      id: newId("cmp"),
      leagueId: league.id,
      sportId: sport.id,
      name: body.name,
      formatType,
      targetEntryCount,
      seasonStart,
      seasonEnd,
      stake: body.stake ?? null,
      prizePool: body.prizePool ?? null,
      status: "draft" as const,
      joinCode: joinCode(),
    };
    await db.insert(competitions).values(comp).run();

    // Catalog events pre-fill the draw pool with their teams (crest/number too).
    if (catalogTeamRows.length > 0) {
      const potId = newId("pot");
      await db.insert(drawPots).values({ id: potId, competitionId: comp.id, name: "Main pool", potType: "open" }).run();
      for (const t of catalogTeamRows) {
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

    return c.json({ id: comp.id, name: comp.name, teamsAdded: catalogTeamRows.length }, 201);
  })
  // Edit the top-level sweepstake fields (name, stake, prize, target).
  .patch("/:id", requireCapability("organise"), async (c) => {
    const db = getDb(c.env);
    const patchSchema = z.object({
      name: z.string().min(2).max(120).optional(),
      stake: z.string().max(120).nullable().optional(),
      prizePool: z.string().max(200).nullable().optional(),
      targetEntryCount: z.number().int().positive().max(200).optional(),
    });
    const body = patchSchema.parse(await c.req.json());
    await db.update(competitions).set(body).where(eq(competitions.id, c.req.param("id"))).run();
    return c.json({ ok: true });
  })
  .delete("/:id", requireCapability("organise"), async (c) => {
    const db = getDb(c.env);
    await deleteCompetitionCascade(db, c.req.param("id"));
    return c.json({ ok: true });
  });
