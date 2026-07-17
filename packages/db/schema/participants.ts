import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { competitions } from "./competitions";
import { users } from "./users";

export const entryStatusValues = ["active", "withdrawn"] as const;
export type EntryStatus = (typeof entryStatusValues)[number];

export const participants = sqliteTable(
  "participants",
  {
    id: text("id").primaryKey(),
    competitionId: text("competition_id")
      .notNull()
      .references(() => competitions.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    paid: integer("paid", { mode: "boolean" }).notNull().default(false),
    paidAt: integer("paid_at", { mode: "timestamp" }),
    entryStatus: text("entry_status", { enum: entryStatusValues }).notNull().default("active"),
    joinedAt: integer("joined_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex("participants_competition_user_idx").on(table.competitionId, table.userId)],
);
