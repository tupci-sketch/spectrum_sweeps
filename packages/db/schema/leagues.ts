import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { officeGroups } from "./office-groups";
import { users } from "./users";

export const leagueStatusValues = ["draft", "active", "archived"] as const;
export type LeagueStatus = (typeof leagueStatusValues)[number];

export const leagues = sqliteTable("leagues", {
  id: text("id").primaryKey(),
  officeGroupId: text("office_group_id")
    .notNull()
    .references(() => officeGroups.id),
  name: text("name").notNull(),
  description: text("description"),
  // What it costs to enter and how the pot pays out — free text so organisers
  // can describe any arrangement (e.g. "£5 per entry", "Winner takes 80%").
  stake: text("stake"),
  prizePool: text("prize_pool"),
  status: text("status", { enum: leagueStatusValues }).notNull().default("draft"),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
