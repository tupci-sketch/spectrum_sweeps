import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { officeGroups } from "./office-groups";

export const userRoleValues = ["admin", "organiser", "moderator", "participant"] as const;
export type UserRole = (typeof userRoleValues)[number];

export const userStatusValues = ["invited", "active", "disabled"] as const;
export type UserStatus = (typeof userStatusValues)[number];

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  nickname: text("nickname").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: userRoleValues }).notNull().default("participant"),
  officeGroupId: text("office_group_id").references(() => officeGroups.id),
  avatarUrl: text("avatar_url"),
  bhiveEmployeeId: text("bhive_employee_id"),
  status: text("status", { enum: userStatusValues }).notNull().default("invited"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
