import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { competitions } from "./competitions";
import { formatTypeValues } from "./sports";

// Materialized leaderboard reads hit this table — scoring is never recomputed
// on the read path. Written by the scoring engine (apps/worker/server/scoring)
// whenever new score_events land for a competition.
export const standingsSnapshots = sqliteTable("standings_snapshots", {
  id: text("id").primaryKey(),
  competitionId: text("competition_id")
    .notNull()
    .references(() => competitions.id),
  // Millisecond precision (not the usual unixepoch() seconds) — recompute
  // can fire multiple times within the same second (e.g. burst result entry),
  // and reads rely on ordering by computedAt to find the latest snapshot.
  computedAt: integer("computed_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
  formatType: text("format_type", { enum: formatTypeValues }).notNull(),
  snapshot: text("snapshot", { mode: "json" }).notNull().$type<Record<string, unknown>>(),
  isFinal: integer("is_final", { mode: "boolean" }).notNull().default(false),
});
