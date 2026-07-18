import { eq } from "drizzle-orm";
import type { Db } from "@spectrum-sweeps/db";
import { catalogLeagues, catalogTeams, catalogFixtures } from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";

// Importer for the Premier League's own Fantasy PL feed (public, no key). It
// tracks the real season: fixtures + results flow in as the FPL data updates.
//
// Off-season safety: FPL only serves the *current/just-finished* season, so
// before 2026/27 rolls over it returns 2025/26. We therefore only sync when the
// feed actually contains fixtures at/after the catalog league's season start —
// otherwise it's a no-op and the seeded 2026/27 team names stay untouched.

const FPL_BASE = "https://fantasy.premierleague.com/api";

// FPL 3-letter codes are stable → canonical catalog names (2026/27 field).
const CODE_TO_NAME: Record<string, string> = {
  ARS: "Arsenal", AVL: "Aston Villa", BOU: "Bournemouth", BRE: "Brentford",
  BHA: "Brighton & Hove Albion", CHE: "Chelsea", COV: "Coventry City",
  CRY: "Crystal Palace", EVE: "Everton", FUL: "Fulham", HUL: "Hull City",
  IPS: "Ipswich Town", LEE: "Leeds United", LIV: "Liverpool", MCI: "Manchester City",
  MUN: "Manchester United", NEW: "Newcastle United", NFO: "Nottingham Forest",
  SUN: "Sunderland", TOT: "Tottenham Hotspur",
};

interface FplTeam { id: number; name: string; short_name: string; code: number; }
interface FplFixture {
  id: number; event: number | null; team_h: number; team_a: number;
  team_h_score: number | null; team_a_score: number | null;
  kickoff_time: string | null; finished: boolean;
}

export interface SyncResult {
  synced: boolean;
  reason?: string;
  teams?: number;
  fixtures?: number;
}

export async function syncFplLeague(db: Db, leagueId: string): Promise<SyncResult> {
  const [league] = await db.select().from(catalogLeagues).where(eq(catalogLeagues.id, leagueId)).all();
  if (!league) return { synced: false, reason: "league not found" };
  if (league.externalSource !== "fpl") return { synced: false, reason: "league is not FPL-sourced" };

  const [bootstrapRes, fixturesRes] = await Promise.all([
    fetch(`${FPL_BASE}/bootstrap-static/`, { headers: { "User-Agent": "SpectrumSweeps/1.0" } }),
    fetch(`${FPL_BASE}/fixtures/`, { headers: { "User-Agent": "SpectrumSweeps/1.0" } }),
  ]);
  if (!bootstrapRes.ok || !fixturesRes.ok) return { synced: false, reason: "FPL feed unavailable" };

  const bootstrap = (await bootstrapRes.json()) as { teams: FplTeam[] };
  const fixtures = (await fixturesRes.json()) as FplFixture[];

  // Season gate: only sync when the feed holds this catalog season's fixtures.
  const seasonStart = league.seasonStart ? league.seasonStart.getTime() : 0;
  const cutoff = seasonStart - 14 * 24 * 60 * 60 * 1000; // allow a fortnight lead-in
  const seasonFixtures = fixtures.filter((f) => f.kickoff_time && new Date(f.kickoff_time).getTime() >= cutoff);
  if (seasonFixtures.length === 0) {
    return { synced: false, reason: "FPL has not published this season's fixtures yet" };
  }

  // Reconcile teams: match each FPL team to a seeded catalog team by its stable
  // 3-letter code, tag it with the FPL id/crest. Build FPL team id -> catalog id.
  const existing = await db.select().from(catalogTeams).where(eq(catalogTeams.catalogLeagueId, leagueId)).all();
  const byName = new Map(existing.map((t) => [t.name, t]));
  const fplToCatalog = new Map<number, string>();

  for (const ft of bootstrap.teams) {
    const canonical = CODE_TO_NAME[ft.short_name];
    if (!canonical) continue;
    const crest = `https://resources.premierleague.com/premierleague/badges/70/t${ft.code}.png`;
    const match = byName.get(canonical);
    if (match) {
      await db
        .update(catalogTeams)
        .set({ shortName: ft.short_name, externalRef: String(ft.id), crestUrl: crest })
        .where(eq(catalogTeams.id, match.id))
        .run();
      fplToCatalog.set(ft.id, match.id);
    } else {
      const id = newId("cteam");
      await db
        .insert(catalogTeams)
        .values({ id, catalogLeagueId: leagueId, name: canonical, shortName: ft.short_name, externalRef: String(ft.id), crestUrl: crest, sortOrder: 0 })
        .run();
      fplToCatalog.set(ft.id, id);
    }
  }

  // Upsert fixtures by FPL fixture id.
  const existingFx = await db.select().from(catalogFixtures).where(eq(catalogFixtures.catalogLeagueId, leagueId)).all();
  const fxByRef = new Map(existingFx.map((f) => [f.externalRef, f]));
  let fxCount = 0;
  for (const f of seasonFixtures) {
    const home = fplToCatalog.get(f.team_h);
    const away = fplToCatalog.get(f.team_a);
    if (!home || !away) continue;
    const ref = String(f.id);
    const values = {
      catalogLeagueId: leagueId,
      matchweek: f.event ?? 0,
      homeTeamId: home,
      awayTeamId: away,
      kickoffAt: f.kickoff_time ? new Date(f.kickoff_time) : null,
      homeScore: f.team_h_score,
      awayScore: f.team_a_score,
      played: f.finished,
      externalRef: ref,
    };
    const prev = fxByRef.get(ref);
    if (prev) {
      await db.update(catalogFixtures).set(values).where(eq(catalogFixtures.id, prev.id)).run();
    } else {
      await db.insert(catalogFixtures).values({ id: newId("cfx"), ...values }).run();
    }
    fxCount++;
  }

  await db.update(catalogLeagues).set({ lastSyncedAt: new Date() }).where(eq(catalogLeagues.id, leagueId)).run();
  return { synced: true, teams: fplToCatalog.size, fixtures: fxCount };
}

// Runs the sync for every FPL-sourced catalog league (used by the cron poller).
export async function syncAllFplLeagues(db: Db): Promise<Record<string, SyncResult>> {
  const leagues = await db.select().from(catalogLeagues).where(eq(catalogLeagues.externalSource, "fpl")).all();
  const out: Record<string, SyncResult> = {};
  for (const l of leagues) out[l.id] = await syncFplLeague(db, l.id);
  return out;
}
