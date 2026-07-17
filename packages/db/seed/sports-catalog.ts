// Seed data for the initial sports catalog. scoring_config shapes here must
// match packages/shared/scoring-config-schemas (validated on admin edit, not
// re-validated at seed time — keep this file in sync by hand).

export interface SportSeed {
  id: string;
  name: string;
  formatType: "knockout" | "season_long" | "standings";
  scoringConfig: Record<string, unknown>;
  icon: string;
}

export const sportsCatalog: SportSeed[] = [
  {
    id: "sport_world_cup",
    name: "FIFA World Cup",
    formatType: "knockout",
    icon: "trophy",
    scoringConfig: {
      pointsPerRoundReached: {
        group_stage: 0,
        round_of_16: 1,
        quarter_final: 2,
        semi_final: 3,
        final: 4,
        winner: 6,
      },
    },
  },
  {
    id: "sport_premier_league",
    name: "Premier League",
    formatType: "season_long",
    icon: "shield",
    scoringConfig: {
      winnerTakesAll: true,
      tiebreaker: "final_league_position",
    },
  },
  {
    id: "sport_f1",
    name: "Formula 1",
    formatType: "standings",
    icon: "flag-checkered",
    scoringConfig: {
      pointsTable: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
      bonusPoints: { fastestLap: 1 },
    },
  },
];
