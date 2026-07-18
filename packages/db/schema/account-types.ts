import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Editable roles/permissions. An L7 owner can create account types and toggle
// what each can do; a user's `account_type` name links here. Capabilities gate
// specific actions (runDraw, generateCodes, …) alongside the numeric level.
export const capabilityKeys = [
  "organise",
  "runDraw",
  "generateCodes",
  "viewAudit",
  "moderate",
  "createPolls",
  "createMiniGames",
  "manageRoles",
] as const;
export type CapabilityKey = (typeof capabilityKeys)[number];
export type Permissions = Partial<Record<CapabilityKey, boolean>>;

export const accountTypes = sqliteTable(
  "account_types",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    level: integer("level").notNull().default(1),
    permissions: text("permissions", { mode: "json" }).notNull().$type<Permissions>(),
    // System types can't be deleted (owner/participant), but their permissions
    // are still editable.
    isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex("account_types_name_idx").on(table.name)],
);
