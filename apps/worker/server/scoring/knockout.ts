import type { KnockoutScoringConfig } from "@spectrum-sweeps/shared";
import type { KnockoutRow, ScorerInput } from "./types";

const WINNER_KEY = "winner";

export function knockoutScorer({ scoringConfig, scoreEvents, assignments }: ScorerInput): KnockoutRow[] {
  const config = scoringConfig as KnockoutScoringConfig;

  // Best (highest-points) round_elimination event per pot_entry — later
  // updates can only move a team further, so "best so far" is always correct.
  const bestRoundByPotEntry = new Map<string, string>();
  for (const event of scoreEvents) {
    if (event.eventType !== "round_elimination") continue;
    const roundReached = event.payload.roundReached;
    if (typeof roundReached !== "string" || !(roundReached in config.pointsPerRoundReached)) continue;

    const current = bestRoundByPotEntry.get(event.subjectRef);
    const currentPoints = current ? config.pointsPerRoundReached[current] : -Infinity;
    if (config.pointsPerRoundReached[roundReached] > currentPoints) {
      bestRoundByPotEntry.set(event.subjectRef, roundReached);
    }
  }

  return assignments.map(({ participantId, potEntryId }) => {
    const roundReached = bestRoundByPotEntry.get(potEntryId);
    if (!roundReached) {
      return { participantId, roundReached: "not_started", eliminated: false, points: 0 };
    }
    return {
      participantId,
      roundReached,
      eliminated: roundReached !== WINNER_KEY,
      points: config.pointsPerRoundReached[roundReached],
    };
  });
}
