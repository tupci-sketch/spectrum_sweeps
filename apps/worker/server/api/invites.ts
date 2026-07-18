import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { inviteCodes, codePurposeValues } from "@spectrum-sweeps/db";
import { newId } from "@spectrum-sweeps/shared";
import { z } from "zod";
import type { AppEnv } from "./bindings";
import { getDb } from "./db";
import { requireAuth, requireLevel } from "../auth/middleware";

const createSchema = z.object({
  purpose: z.enum(codePurposeValues),
  role: z.string().optional(),
  grantLevel: z.number().int().min(1).max(7).optional(),
  accountType: z.string().optional(),
  officeGroupId: z.string().optional(),
  competitionId: z.string().optional(),
  note: z.string().optional(),
  expiresInDays: z.number().int().positive().optional(),
});

// Readable one-time code, e.g. "SPCT-7Q4K9X". Ambiguous chars removed.
function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const body = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `SPCT-${body}`;
}

export const invitesApi = new Hono<AppEnv>()
  .use("*", requireAuth)
  .get("/", requireLevel(5), async (c) => {
    const db = getDb(c.env);
    return c.json(await db.select().from(inviteCodes).orderBy(desc(inviteCodes.createdAt)).all());
  })
  .post("/", requireLevel(5), async (c) => {
    const body = createSchema.parse(await c.req.json());
    const actor = c.get("user")!;
    const db = getDb(c.env);

    // Organiser grants (delegating league administration) are owner-only (L7).
    if (body.purpose === "organiser_grant" && actor.level < 7) {
      return c.json({ error: "only the site owner can issue organiser grants" }, 403);
    }

    const row = {
      id: newId("code"),
      code: generateCode(),
      purpose: body.purpose,
      role: body.role ?? "participant",
      grantLevel: body.grantLevel ?? 1,
      accountType: body.accountType ?? "participant",
      officeGroupId: body.officeGroupId ?? null,
      competitionId: body.competitionId ?? null,
      note: body.note ?? null,
      createdBy: actor.id,
      expiresAt: body.expiresInDays ? new Date(Date.now() + body.expiresInDays * 86_400_000) : null,
    };
    await db.insert(inviteCodes).values(row).run();
    return c.json(row, 201);
  })
  .delete("/:id", requireLevel(5), async (c) => {
    const db = getDb(c.env);
    await db.delete(inviteCodes).where(eq(inviteCodes.id, c.req.param("id"))).run();
    return c.json({ ok: true });
  });
