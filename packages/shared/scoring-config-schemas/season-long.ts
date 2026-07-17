import { z } from "zod";

export const seasonLongScoringConfigSchema = z.object({
  winnerTakesAll: z.literal(true),
  tiebreaker: z.enum(["final_league_position", "goal_difference", "head_to_head"]).default("final_league_position"),
});

export type SeasonLongScoringConfig = z.infer<typeof seasonLongScoringConfigSchema>;
