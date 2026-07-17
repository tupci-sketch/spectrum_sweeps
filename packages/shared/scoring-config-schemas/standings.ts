import { z } from "zod";

// pointsTable[i] = points awarded for finishing position i+1.
// bonusPoints is a free-form named-bonus map (e.g. F1's "fastestLap": 1) so
// standings-format sports beyond F1 don't need code changes to add bonuses.
export const standingsScoringConfigSchema = z.object({
  pointsTable: z.array(z.number().int().min(0)).min(1),
  bonusPoints: z.record(z.string(), z.number().int()).optional(),
});

export type StandingsScoringConfig = z.infer<typeof standingsScoringConfigSchema>;
