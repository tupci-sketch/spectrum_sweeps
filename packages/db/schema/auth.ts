import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const codePurposeValues = ["signup", "organiser_grant", "draw_entry"] as const;
export type CodePurpose = (typeof codePurposeValues)[number];

// Typed one-time codes, generated from purpose-specific housekeeping buttons.
// - signup: lets a new person register (optionally pre-sets role/level/office)
// - organiser_grant: site owner lets an Organiser-type account create + admin
//   their own league (guards against abuse of the shared system)
// - draw_entry: a participant verifies entry into a specific competition
// Single-use and attributable; redeemedByUserId set when consumed.
export const inviteCodes = sqliteTable(
  "invite_codes",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    purpose: text("purpose", { enum: codePurposeValues }).notNull().default("signup"),
    // signup: role/level/type granted to the new user
    role: text("role").notNull().default("participant"),
    grantLevel: integer("grant_level").notNull().default(1),
    accountType: text("account_type").notNull().default("participant"),
    officeGroupId: text("office_group_id"),
    // draw_entry: which competition this code admits to
    competitionId: text("competition_id"),
    note: text("note"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    redeemedByUserId: text("redeemed_by_user_id").references(() => users.id),
    redeemedAt: integer("redeemed_at", { mode: "timestamp" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex("invite_codes_code_idx").on(table.code)],
);

// Opaque server-side session tokens (the cookie holds the random id; the row is
// the source of truth so logout/expiry is enforced server-side). Simpler and
// safer to reason about than stateless JWTs for an internal tool.
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});
