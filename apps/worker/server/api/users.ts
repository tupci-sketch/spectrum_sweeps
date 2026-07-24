import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { users, userRoleValues } from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";
import { z } from "zod";
import type { AppEnv } from "./bindings";
import { getDb } from "./db";
import { firstNameOf, recomputeDisplayNames } from "./display-names";

const createSchema = z.object({
  fullName: z.string().min(2).max(80),
  role: z.enum(userRoleValues).optional(),
  officeGroupId: z.string().optional(),
});

// Public-safe projection — the leaderboard/profile pages need the display
// handle but must never receive the real full name or password hash.
const publicColumns = {
  id: users.id,
  nickname: users.nickname,
  displayName: users.displayName,
  role: users.role,
  level: users.level,
  accountType: users.accountType,
  avatarUrl: users.avatarUrl,
  bio: users.bio,
} as const;

export const usersApi = new Hono<AppEnv>()
  .get("/", async (c) => {
    const db = getDb(c.env);
    // Privileged callers (L5+) get full rows incl. email for admin management;
    // everyone else gets the public projection.
    const requester = c.get("user");
    if (requester && requester.level >= 5) {
      const rows = await db.select().from(users).all();
      return c.json(rows.map(({ passwordHash: _p, ...rest }) => rest));
    }
    return c.json(await db.select(publicColumns).from(users).all());
  })
  // Find-or-create by full name — lets the admin add a participant by just
  // typing their name; re-adding the same name returns the existing account
  // rather than creating a duplicate.
  .post("/", async (c) => {
    const body = createSchema.parse(await c.req.json());
    const db = getDb(c.env);
    const full = body.fullName.trim();

    const [existing] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.fullName}) = ${full.toLowerCase()}`)
      .all();
    if (existing) {
      const { passwordHash: _p, ...safe } = existing;
      return c.json(safe);
    }

    const first = firstNameOf(full);
    const row = {
      id: newId("user"),
      fullName: full,
      email: null,
      nickname: first,
      displayName: first,
      role: body.role ?? ("participant" as const),
      officeGroupId: body.officeGroupId ?? null,
      status: "active" as const,
    };
    await db.insert(users).values(row).run();
    await recomputeDisplayNames(db);
    const [created] = await db.select().from(users).where(sql`${users.id} = ${row.id}`).all();
    const { passwordHash: _p, ...safe } = created;
    return c.json(safe, 201);
  });
