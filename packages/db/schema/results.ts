import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { competitions } from "./competitions";
import { users } from "./users";

export const scoreEventTypeValues = [
  "match_result",
  "round_elimination",
  "race_result",
  "points_award",
] as const;
export type ScoreEventType = (typeof scoreEventTypeValues)[number];

export const scoreEventSourceValues = ["manual", "api_import"] as const;
export type ScoreEventSource = (typeof scoreEventSourceValues)[number];

// subjectRef always points at a pot_entries.id (the team/driver/constructor) —
// results are entered against the thing that plays, and attributed to
// whichever participant drew it via the assignments join. Not a typed FK
// since pot_entries isn't imported here to avoid a schema-file import cycle.
export const scoreEvents = sqliteTable("score_events", {
  id: text("id").primaryKey(),
  competitionId: text("competition_id")
    .notNull()
    .references(() => competitions.id),
  subjectRef: text("subject_ref").notNull(),
  eventType: text("event_type", { enum: scoreEventTypeValues }).notNull(),
  payload: text("payload", { mode: "json" }).notNull().$type<Record<string, unknown>>(),
  recordedBy: text("recorded_by")
    .notNull()
    .references(() => users.id),
  recordedAt: integer("recorded_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  source: text("source", { enum: scoreEventSourceValues }).notNull().default("manual"),
});
