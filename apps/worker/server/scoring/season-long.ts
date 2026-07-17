import type { SeasonLongRow, ScorerInput } from "./types";

// scoringConfig (winnerTakesAll/tiebreaker) isn't consulted here — the whole
// point of season_long is "no scoring math, just who won the league" — but it
// stays part of the Scorer signature so all three scorers share one interface.
export function seasonLongScorer({ scoreEvents, assignments }: ScorerInput): SeasonLongRow[] {
  const latestByPotEntry = new Map<string, { leaguePosition: number | null; isChampion: boolean; recordedAt: number }>();

  for (const event of scoreEvents) {
    if (event.eventType !== "points_award") continue;
    const existing = latestByPotEntry.get(event.subjectRef);
    if (existing && existing.recordedAt >= event.recordedAt) continue;

    const leaguePosition =
      typeof event.payload.leaguePosition === "number" ? event.payload.leaguePosition : null;
    latestByPotEntry.set(event.subjectRef, {
      leaguePosition,
      isChampion: event.payload.isChampion === true,
      recordedAt: event.recordedAt,
    });
  }

  return assignments.map(({ participantId, potEntryId }) => {
    const state = latestByPotEntry.get(potEntryId);
    return {
      participantId,
      leaguePosition: state?.leaguePosition ?? null,
      isChampion: state?.isChampion ?? false,
    };
  });
}
