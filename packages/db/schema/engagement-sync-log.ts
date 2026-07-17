import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { leagues } from "./leagues";
import { competitions } from "./competitions";
import { users } from "./users";

export const syncTierValues = ["manual_export", "api_sync"] as const;
export type SyncTier = (typeof syncTierValues)[number];

export const syncDirectionValues = ["export", "push"] as const;
export type SyncDirection = (typeof syncDirectionValues)[number];

export const syncStatusValues = ["pending", "success", "failed", "retried"] as const;
export type SyncStatus = (typeof syncStatusValues)[number];

// Append-only, mirrors draw_audit_log's audit posture — this is the record of
// what was pushed to B-Hive and when, for both the Tier 1 manual export and
// the Tier 2 API sync (phase 5).
export const engagementSyncLog = sqliteTable("engagement_sync_log", {
  id: text("id").primaryKey(),
  leagueId: text("league_id").references(() => leagues.id),
  competitionId: text("competition_id").references(() => competitions.id),
  syncTier: text("sync_tier", { enum: syncTierValues }).notNull(),
  direction: text("direction", { enum: syncDirectionValues }).notNull(),
  payloadRef: text("payload_ref"),
  status: text("status", { enum: syncStatusValues }).notNull().default("pending"),
  externalReferenceId: text("external_reference_id"),
  initiatedBy: text("initiated_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});
