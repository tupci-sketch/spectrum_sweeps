import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { users, userRoleValues } from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";
import { z } from "zod";
import type { AppEnv } from "./bindings";
import { getDb } from "./db";

const createSchema = z.object({
  email: z.string().email(),
  nickname: z.string().min(1),
  displayName: z.string().min(1).optional(),
  role: z.enum(userRoleValues).optional(),
  officeGroupId: z.string().optional(),
});

// Public-safe projection — the leaderboard/profile pages need nicknames but
// must never receive emails or password hashes.
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
  // Find-or-create by email — lets the admin add a participant by just typing a
  // name + email without a separate user-management step; re-adding the same
  // email returns the existing user rather than erroring on the unique index.
  .post("/", async (c) => {
    const body = createSchema.parse(await c.req.json());
    const db = getDb(c.env);

    const [existing] = await db.select().from(users).where(eq(users.email, body.email)).all();
    if (existing) {
      const { passwordHash: _p, ...safe } = existing;
      return c.json(safe);
    }

    const row = {
      id: newId("user"),
      email: body.email,
      nickname: body.nickname,
      displayName: body.displayName ?? body.nickname,
      role: body.role ?? ("participant" as const),
      officeGroupId: body.officeGroupId ?? null,
      status: "active" as const,
    };
    await db.insert(users).values(row).run();
    return c.json(row, 201);
  });
