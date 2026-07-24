import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { officeGroups } from "./office-groups";

export const userRoleValues = ["admin", "organiser", "moderator", "participant"] as const;
export type UserRole = (typeof userRoleValues)[number];

export const userStatusValues = ["invited", "active", "disabled"] as const;
export type UserStatus = (typeof userStatusValues)[number];

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  // Real name (e.g. "Corey Topping"). It's a company tool, so full names are
  // collected; the app shows a first name + last initial derived from this.
  fullName: text("full_name"),
  // Optional — signup is invite-code only, so email is no longer required.
  email: text("email"),
  // Computed display handle: first name, plus a last initial only when another
  // account shares that first name. Kept in sync so all read paths stay simple.
  nickname: text("nickname").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: userRoleValues }).notNull().default("participant"),
  // Numeric privilege level (L1–L7). The first-ever account is L7 (site owner);
  // powerful actions (edit roles/permissions, run the live spin) gate on level.
  level: integer("level").notNull().default(1),
  accountType: text("account_type").notNull().default("participant"),
  officeGroupId: text("office_group_id").references(() => officeGroups.id),
  avatarUrl: text("avatar_url"),
  bhiveEmployeeId: text("bhive_employee_id"),
  // PBKDF2 hash string (algo$iterations$saltB64$hashB64). Null for legacy/seeded
  // users created before auth existed — they can't log in until a password is set.
  passwordHash: text("password_hash"),
  bio: text("bio"),
  status: text("status", { enum: userStatusValues }).notNull().default("invited"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
