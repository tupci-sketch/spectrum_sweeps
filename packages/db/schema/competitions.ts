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
    joinCode: text("join_code").notNull(),
    joinCodeExpiresAt: integer("join_code_expires_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex("competitions_join_code_idx").on(table.joinCode)],
);
