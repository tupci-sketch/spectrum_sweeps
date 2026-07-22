import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { catalogLeagues, catalogTeams, catalogFixtures } from "@spectrum-sweeps/db";
import type { AppEnv } from "./bindings";
import { getDb } from "./db";
import { requireLevel } from "../auth/middleware";
import { syncFplLeague } from "../catalog/fpl";

interface TableRow {
  teamId: string; name: string; crestUrl: string | null;
  played: number; won: number; drawn: number; lost: number;
  gf: number; ga: number; gd: number; points: number;
}

// Derive the live league table from played fixtures — this is the "table as it
// moves through the season" a season-long sweepstake tracks against.
function computeTable(
  teams: { id: string; name: string; crestUrl: string | null }[],
  fixtures: { homeTeamId: string; awayTeamId: string; homeScore: number | null; awayScore: number | null; played: boolean }[],
): TableRow[] {
  const rows = new Map<string, TableRow>(
    teams.map((t) => [t.id, { teamId: t.id, name: t.name, crestUrl: t.crestUrl, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }]),
  );
  for (const f of fixtures) {
    if (!f.played || f.homeScore == null || f.awayScore == null) continue;
    const h = rows.get(f.homeTeamId);
    const a = rows.get(f.awayTeamId);
    if (!h || !a) continue;
    h.played++; a.played++;
    h.gf += f.homeScore; h.ga += f.awayScore;
    a.gf += f.awayScore; a.ga += f.homeScore;
    if (f.homeScore > f.awayScore) { h.won++; h.points += 3; a.lost++; }
    else if (f.homeScore < f.awayScore) { a.won++; a.points += 3; h.lost++; }
    else { h.drawn++; a.drawn++; h.points++; a.points++; }
  }
  return [...rows.values()]
    .map((r) => ({ ...r, gd: r.gf - r.ga }))
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name));
}

export const catalogApi = new Hono<AppEnv>()
  .get("/", async (c) => {
    const db = getDb(c.env);
    const leagues = await db.select().from(catalogLeagues).all();
    const teams = await db.select().from(catalogTeams).all();
    const countByLeague = new Map<string, number>();
    for (const t of teams) countByLeague.set(t.catalogLeagueId, (countByLeague.get(t.catalogLeagueId) ?? 0) + 1);
    return c.json(leagues.map((l) => ({ ...l, teamCount: countByLeague.get(l.id) ?? 0 })));
  })
  .get("/:id", async (c) => {
    const db = getDb(c.env);
    const id = c.req.param("id");
    const [league] = await db.select().from(catalogLeagues).where(eq(catalogLeagues.id, id)).all();
    if (!league) return c.json({ error: "not found" }, 404);
    const teams = await db.select().from(catalogTeams).where(eq(catalogTeams.catalogLeagueId, id)).all();
    const fixtures = await db.select().from(catalogFixtures).where(eq(catalogFixtures.catalogLeagueId, id)).all();
    const table = league.formatType === "season_long" ? computeTable(teams, fixtures) : [];
    return c.json({ league, teams, fixtures, table });
  })
  // Manually trigger a sync against the official feed (also runs on a cron).
  .post("/:id/sync", requireLevel(5), async (c) => {
    const db = getDb(c.env);
    const result = await syncFplLeague(db, c.req.param("id"));
    return c.json(result);
  });
