import { z } from "zod";

// pointsPerRoundReached is a free-form map (round name -> points) so a new
// knockout sport (Rugby World Cup, NFL playoffs) is config-only: no code change.
export const knockoutScoringConfigSchema = z.object({
  pointsPerRoundReached: z.record(z.string(), z.number().int().min(0)),
});

export type KnockoutScoringConfig = z.infer<typeof knockoutScoringConfigSchema>;
