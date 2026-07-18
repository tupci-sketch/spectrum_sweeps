import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { formatTypeValues } from "@spectrum-sweeps/shared";

// Reference data ("selectable leagues") — real competitions with their teams
// and fixtures, pre-seeded so an organiser can spin up a sweepstake from a
// ready-made pool instead of typing 20 team names. Separate from the live
// `competitions` (actual sweepstakes); a sweepstake copies teams from here.

export const catalogLeagues = sqliteTable("catalog_leagues", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sportLabel: text("sport_label").notNull(),
  formatType: text("format_type", { enum: formatTypeValues }).notNull(),
  season: text("season").notNull(),
  seasonStart: integer("season_start", { mode: "timestamp" }),
  seasonEnd: integer("season_end", { mode: "timestamp" }),
  // Official source the teams/fixtures track against (e.g. "fpl"). Null = manual.
  externalSource: text("external_source"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const catalogTeams = sqliteTable("catalog_teams", {
  id: text("id").primaryKey(),
  catalogLeagueId: text("catalog_league_id")
    .notNull()
    .references(() => catalogLeagues.id),
  name: text("name").notNull(),
  shortName: text("short_name"),
  // Motorsport uses number+styling; teams/nations use a crest. Both optional,
  // populated later (crests sourced from the web where available).
  crestUrl: text("crest_url"),
  competitorNumber: integer("competitor_number"),
  // Stable id from the source feed, so re-imports update rather than duplicate.
  externalRef: text("external_ref"),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Fixtures for season-long/knockout leagues — results get entered here and the
// table/bracket is derived from played fixtures as the season progresses.
export const catalogFixtures = sqliteTable("catalog_fixtures", {
  id: text("id").primaryKey(),
  catalogLeagueId: text("catalog_league_id")
    .notNull()
    .references(() => catalogLeagues.id),
  matchweek: integer("matchweek").notNull(),
  stage: text("stage"),
  homeTeamId: text("home_team_id").notNull(),
  awayTeamId: text("away_team_id").notNull(),
  kickoffAt: integer("kickoff_at", { mode: "timestamp" }),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  played: integer("played", { mode: "boolean" }).notNull().default(false),
  externalRef: text("external_ref"),
});
