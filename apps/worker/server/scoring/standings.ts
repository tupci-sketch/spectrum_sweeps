import type { StandingsScoringConfig } from "@spectrum-sweeps/shared";
import type { StandingsRow, ScorerInput } from "./types";

export function standingsScorer({ scoringConfig, scoreEvents, assignments }: ScorerInput): StandingsRow[] {
  const config = scoringConfig as StandingsScoringConfig;

  const pointsByPotEntry = new Map<string, number>();
  const addPoints = (potEntryId: string, delta: number) => {
    pointsByPotEntry.set(potEntryId, (pointsByPotEntry.get(potEntryId) ?? 0) + delta);
  };

  for (const event of scoreEvents) {
    if (event.eventType !== "race_result" && event.eventType !== "points_award") continue;

    const finishingPosition = event.payload.finishingPosition;
    if (typeof finishingPosition === "number") {
      const points = config.pointsTable[finishingPosition - 1] ?? 0;
      addPoints(event.subjectRef, points);
    }

    const bonuses = event.payload.bonuses;
    if (Array.isArray(bonuses) && config.bonusPoints) {
      for (const bonus of bonuses) {
        if (typeof bonus === "string" && bonus in config.bonusPoints) {
          addPoints(event.subjectRef, config.bonusPoints[bonus]);
        }
      }
    }
  }

  const rows = assignments.map(({ participantId, potEntryId }) => ({
    participantId,
    points: pointsByPotEntry.get(potEntryId) ?? 0,
  }));

  return rows
    .sort((a, b) => b.points - a.points)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}
