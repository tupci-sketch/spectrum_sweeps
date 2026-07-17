import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { leagues } from "./leagues";

export const prizeConfigs = sqliteTable("prize_configs", {
  id: text("id").primaryKey(),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id),
  prizeType: text("prize_type").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("GBP"),
  distributionRule: text("distribution_rule", { mode: "json" }).notNull().$type<Record<string, unknown>>(),
  bhiveSyncEnabled: integer("bhive_sync_enabled", { mode: "boolean" }).notNull().default(false),
  bhivePointsValue: integer("bhive_points_value"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
