import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { competitions } from "./competitions";
import { participants } from "./participants";
import { users } from "./users";

export const potTypeValues = ["open", "seeded"] as const;
export type PotType = (typeof potTypeValues)[number];

export const drawPots = sqliteTable("draw_pots", {
  id: text("id").primaryKey(),
  competitionId: text("competition_id")
    .notNull()
    .references(() => competitions.id),
  name: text("name").notNull(),
  potType: text("pot_type", { enum: potTypeValues }).notNull().default("open"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const potEntries = sqliteTable("pot_entries", {
  id: text("id").primaryKey(),
  drawPotId: text("draw_pot_id")
    .notNull()
    .references(() => drawPots.id),
  teamOrDriverLabel: text("team_or_driver_label").notNull(),
  seedOrder: integer("seed_order"),
  isDrawn: integer("is_drawn", { mode: "boolean" }).notNull().default(false),
});

export const revealModeValues = ["standard", "secret"] as const;
export type RevealMode = (typeof revealModeValues)[number];

// One row per participant per competition — the unique index is what enforces
// "a random draw happens exactly once" at the schema level, not just in application code.
export const assignments = sqliteTable(
  "assignments",
  {
    id: text("id").primaryKey(),
    competitionId: text("competition_id")
      .notNull()
      .references(() => competitions.id),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id),
    drawPotId: text("draw_pot_id").references(() => drawPots.id),
    potEntryId: text("pot_entry_id")
      .notNull()
      .references(() => potEntries.id),
    assignedAt: integer("assigned_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    drawnBy: text("drawn_by")
      .notNull()
      .references(() => users.id),
    revealMode: text("reveal_mode", { enum: revealModeValues }).notNull().default("standard"),
  },
  (table) => [uniqueIndex("assignments_competition_participant_idx").on(table.competitionId, table.participantId)],
);

export const drawAuditEventTypeValues = [
  "pot_created",
  "draw_committed",
  "draw_completed",
  "assignment_made",
  "draw_voided",
] as const;
export type DrawAuditEventType = (typeof drawAuditEventTypeValues)[number];

// Append-only by convention: no application code path ever issues UPDATE/DELETE
// against this table. It's the immutable proof-of-randomness trail required by
// the work-lottery legal constraint (see plan doc), not just a debug log.
export const drawAuditLog = sqliteTable("draw_audit_log", {
  id: text("id").primaryKey(),
  competitionId: text("competition_id")
    .notNull()
    .references(() => competitions.id),
  eventType: text("event_type", { enum: drawAuditEventTypeValues }).notNull(),
  payload: text("payload", { mode: "json" }).notNull().$type<Record<string, unknown>>(),
  actorUserId: text("actor_user_id")
    .notNull()
    .references(() => users.id),
  occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
