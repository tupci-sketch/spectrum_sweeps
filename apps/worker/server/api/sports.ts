import { Hono } from "hono";
import { sports, formatTypeValues } from "@spectrum-sweeps/db";
import { newId, validateScoringConfig } from "@spectrum-sweeps/shared";
import { z } from "zod";
import type { Bindings } from "./bindings";
import { getDb } from "./db";

const createSchema = z.object({
  name: z.string().min(1),
  formatType: z.enum(formatTypeValues),
  scoringConfig: z.record(z.string(), z.unknown()),
  icon: z.string().optional(),
});

export const sportsApi = new Hono<{ Bindings: Bindings }>()
  .get("/", async (c) => {
    const db = getDb(c.env);
    return c.json(await db.select().from(sports).all());
  })
  .post("/", async (c) => {
    const body = createSchema.parse(await c.req.json());
    // Validates against the format_type's zod schema before it's ever persisted —
    // this is what lets scoring_config stay admin-editable JSON without risking
    // a malformed config silently breaking the scoring engine later.
    const scoringConfig = validateScoringConfig(body.formatType, body.scoringConfig);
    const db = getDb(c.env);
    const row = { id: newId("sport"), ...body, scoringConfig: scoringConfig as Record<string, unknown> };
    await db.insert(sports).values(row).run();
    return c.json(row, 201);
  });
