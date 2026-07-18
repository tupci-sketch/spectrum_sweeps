import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { leagues } from "./leagues";
import { users } from "./users";

// Everything in this file is phase-4 scope (social layer + mini-games).
// Schema is defined now alongside the core model so later migrations aren't
// a surprise, but none of these tables are read/written until phase 4.

export const polls = sqliteTable("polls", {
  id: text("id").primaryKey(),
  // Nullable = a site-wide poll (not tied to a league).
  leagueId: text("league_id").references(() => leagues.id),
  question: text("question").notNull(),
  options: text("options", { mode: "json" }).notNull().$type<string[]>(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  closesAt: integer("closes_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const pollVotes = sqliteTable(
  "poll_votes",
  {
    id: text("id").primaryKey(),
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    optionIndex: integer("option_index").notNull(),
    votedAt: integer("voted_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex("poll_votes_poll_user_idx").on(table.pollId, table.userId)],
);

export const forumThreads = sqliteTable("forum_threads", {
  id: text("id").primaryKey(),
  // Nullable = a site-wide discussion thread.
  leagueId: text("league_id").references(() => leagues.id),
  title: text("title").notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const forumPosts = sqliteTable("forum_posts", {
  id: text("id").primaryKey(),
  threadId: text("thread_id")
    .notNull()
    .references(() => forumThreads.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  editedAt: integer("edited_at", { mode: "timestamp" }),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  leagueId: text("league_id").references(() => leagues.id),
  // Per-draw chat lives against a competition (the draw room's chat window).
  competitionId: text("competition_id"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const miniGames = sqliteTable("mini_games", {
  id: text("id").primaryKey(),
  // Nullable = a site-wide mini-game (e.g. a prediction pool).
  leagueId: text("league_id").references(() => leagues.id),
  name: text("name").notNull(),
  // { kind: "prediction", question, options: string[], pointsForCorrect,
  //   correctIndex: number | null } — correctIndex set when resolved.
  config: text("config", { mode: "json" }).notNull().$type<Record<string, unknown>>(),
  status: text("status").notNull().default("open"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const miniGameEntries = sqliteTable(
  "mini_game_entries",
  {
    id: text("id").primaryKey(),
    miniGameId: text("mini_game_id")
      .notNull()
      .references(() => miniGames.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    selection: integer("selection"),
    pointsAwarded: integer("points_awarded").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex("mini_game_entries_game_user_idx").on(table.miniGameId, table.userId)],
);
