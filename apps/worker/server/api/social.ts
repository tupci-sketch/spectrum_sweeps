import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import {
  forumThreads, forumPosts, polls, pollVotes, chatMessages, users,
} from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";
import { z } from "zod";
import type { AppEnv } from "./bindings";
import { getDb } from "./db";
import { requireAuth, requireLevel } from "../auth/middleware";

const threadSchema = z.object({ title: z.string().min(2).max(140) });
const postSchema = z.object({ body: z.string().min(1).max(4000) });
const pollSchema = z.object({ question: z.string().min(3).max(200), options: z.array(z.string().min(1)).min(2).max(8) });
const voteSchema = z.object({ optionIndex: z.number().int().min(0) });
const chatSchema = z.object({ competitionId: z.string(), body: z.string().min(1).max(1000) });

export const socialApi = new Hono<AppEnv>()
  // ---- Discussions (global forum) ----
  .get("/threads", async (c) => {
    const db = getDb(c.env);
    const threads = await db.select().from(forumThreads).orderBy(desc(forumThreads.createdAt)).all();
    const allUsers = await db.select().from(users).all();
    const nick = new Map(allUsers.map((u) => [u.id, u.nickname]));
    const posts = await db.select().from(forumPosts).all();
    return c.json(
      threads.map((t) => ({
        ...t,
        author: nick.get(t.createdBy) ?? "—",
        replies: posts.filter((p) => p.threadId === t.id).length,
      })),
    );
  })
  .post("/threads", requireAuth, async (c) => {
    const body = threadSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const user = c.get("user")!;
    const row = { id: newId("thr"), leagueId: null, title: body.title, createdBy: user.id, pinned: false };
    await db.insert(forumThreads).values(row).run();
    return c.json(row, 201);
  })
  .get("/threads/:id", async (c) => {
    const db = getDb(c.env);
    const [thread] = await db.select().from(forumThreads).where(eq(forumThreads.id, c.req.param("id"))).all();
    if (!thread) return c.json({ error: "not found" }, 404);
    const posts = await db.select().from(forumPosts).where(eq(forumPosts.threadId, thread.id)).orderBy(forumPosts.createdAt).all();
    const allUsers = await db.select().from(users).all();
    const nick = new Map(allUsers.map((u) => [u.id, u.nickname]));
    return c.json({ thread, posts: posts.map((p) => ({ ...p, author: nick.get(p.userId) ?? "—", authorId: p.userId })) });
  })
  .post("/threads/:id/posts", requireAuth, async (c) => {
    const body = postSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const user = c.get("user")!;
    const row = { id: newId("post"), threadId: c.req.param("id"), userId: user.id, body: body.body };
    await db.insert(forumPosts).values(row).run();
    return c.json(row, 201);
  })

  // ---- Polls ----
  .get("/polls", async (c) => {
    const db = getDb(c.env);
    const all = await db.select().from(polls).orderBy(desc(polls.createdAt)).all();
    const votes = await db.select().from(pollVotes).all();
    const me = c.get("user");
    return c.json(
      all.map((p) => {
        const pv = votes.filter((v) => v.pollId === p.id);
        const counts = (p.options as string[]).map((_, i) => pv.filter((v) => v.optionIndex === i).length);
        return {
          ...p,
          counts,
          total: pv.length,
          myVote: me ? (pv.find((v) => v.userId === me.id)?.optionIndex ?? null) : null,
        };
      }),
    );
  })
  .post("/polls", requireLevel(5), async (c) => {
    const body = pollSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const user = c.get("user")!;
    const row = { id: newId("poll"), leagueId: null, question: body.question, options: body.options, createdBy: user.id };
    await db.insert(polls).values(row).run();
    return c.json(row, 201);
  })
  .post("/polls/:id/vote", requireAuth, async (c) => {
    const { optionIndex } = voteSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const user = c.get("user")!;
    const pollId = c.req.param("id");
    // One vote per user — replace any prior vote.
    await db.delete(pollVotes).where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, user.id))).run();
    await db.insert(pollVotes).values({ id: newId("vote"), pollId, userId: user.id, optionIndex }).run();
    return c.json({ ok: true, optionIndex });
  })

  // ---- Per-draw chat (polled by the draw room) ----
  .get("/chat", async (c) => {
    const db = getDb(c.env);
    const competitionId = c.req.query("competitionId");
    if (!competitionId) return c.json({ error: "competitionId required" }, 400);
    const msgs = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.competitionId, competitionId))
      .orderBy(chatMessages.createdAt)
      .all();
    const allUsers = await db.select().from(users).all();
    const nick = new Map(allUsers.map((u) => [u.id, u.nickname]));
    return c.json(msgs.map((m) => ({ id: m.id, body: m.body, author: nick.get(m.userId) ?? "—", authorId: m.userId, createdAt: m.createdAt })));
  })
  .post("/chat", requireAuth, async (c) => {
    const body = chatSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const user = c.get("user")!;
    const row = { id: newId("msg"), competitionId: body.competitionId, leagueId: null, userId: user.id, body: body.body };
    await db.insert(chatMessages).values(row).run();
    return c.json({ id: row.id }, 201);
  });
