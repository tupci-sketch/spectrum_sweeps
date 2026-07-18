import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { leagues } from "./leagues";
import { sports, formatTypeValues } from "./sports";

export const competitionStatusValues = [
  "draft",
  "draw_pending",
  "active",
  "completed",
  "archived",
] as const;
export type CompetitionStatus = (typeof competitionStatusValues)[number];

// State of the live, scheduled draw (distinct from the competition's own status).
// not_scheduled → scheduled (admin picks a time) → live (spinning) → completed.
export const drawStateValues = ["not_scheduled", "scheduled", "live", "completed"] as const;
export type DrawState = (typeof drawStateValues)[number];

export const competitions = sqliteTable(
  "competitions",
  {
    id: text("id").primaryKey(),
    leagueId: text("league_id")
      .notNull()
      .references(() => leagues.id),
    sportId: text("sport_id")
      .notNull()
      .references(() => sports.id),
    name: text("name").notNull(),
    // Denormalized copy of sports.format_type at creation time — a running
    // competition must not change behavior if the sport's format_type is edited later.
    formatType: text("format_type", { enum: formatTypeValues }).notNull(),
    // Number of teams/drivers in the season (20 for the Premier League, 32 for
    // a World Cup, current F1 grid size, etc). Joining is capped at this, and
    // the draw can only run once the competition is exactly full.
    targetEntryCount: integer("target_entry_count").notNull(),
    seasonStart: integer("season_start", { mode: "timestamp" }).notNull(),
    seasonEnd: integer("season_end", { mode: "timestamp" }).notNull(),
    status: text("status", { enum: competitionStatusValues }).notNull().default("draft"),
    // Scheduled live draw: admin sets drawScheduledAt; on "start" the full
    // random order is fixed by drawSeed and revealed one pick per "spin". The
    // seed makes the whole reveal reproducible/auditable after the fact.
    drawState: text("draw_state", { enum: drawStateValues }).notNull().default("not_scheduled"),
    drawScheduledAt: integer("draw_scheduled_at", { mode: "timestamp" }),
    drawSeed: text("draw_seed"),
    drawStartedByUserId: text("draw_started_by_user_id"),
    joinCode: text("join_code").notNull(),
    joinCodeExpiresAt: integer("join_code_expires_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex("competitions_join_code_idx").on(table.joinCode)],
);
