import { describe, expect, it } from "vitest";
import { knockoutScorer } from "./knockout";
import { seasonLongScorer } from "./season-long";
import { standingsScorer } from "./standings";
import { computeStandingsSnapshot } from "./index";

describe("knockoutScorer", () => {
  const scoringConfig = {
    pointsPerRoundReached: {
      group_stage: 0,
      round_of_16: 1,
      quarter_final: 2,
      semi_final: 3,
      final: 4,
      winner: 6,
    },
  };
  const assignments = [
    { participantId: "p1", potEntryId: "team_a" },
    { participantId: "p2", potEntryId: "team_b" },
    { participantId: "p3", potEntryId: "team_c" },
  ];

  it("tracks the furthest round reached per team and flags the winner", () => {
    const rows = knockoutScorer({
      scoringConfig,
      assignments,
      scoreEvents: [
        { subjectRef: "team_a", eventType: "round_elimination", payload: { roundReached: "round_of_16" }, recordedAt: 1 },
        { subjectRef: "team_a", eventType: "round_elimination", payload: { roundReached: "quarter_final" }, recordedAt: 2 },
        { subjectRef: "team_b", eventType: "round_elimination", payload: { roundReached: "winner" }, recordedAt: 5 },
      ],
    });

    expect(rows).toEqual([
      { participantId: "p1", roundReached: "quarter_final", eliminated: true, points: 2 },
      { participantId: "p2", roundReached: "winner", eliminated: false, points: 6 },
      { participantId: "p3", roundReached: "not_started", eliminated: false, points: 0 },
    ]);
  });

  it("is stable against out-of-order events (best round always wins, not most recent)", () => {
    const rows = knockoutScorer({
      scoringConfig,
      assignments: [{ participantId: "p1", potEntryId: "team_a" }],
      scoreEvents: [
        { subjectRef: "team_a", eventType: "round_elimination", payload: { roundReached: "final" }, recordedAt: 10 },
        { subjectRef: "team_a", eventType: "round_elimination", payload: { roundReached: "round_of_16" }, recordedAt: 20 },
      ],
    });
    expect(rows[0]).toMatchObject({ roundReached: "final", points: 4 });
  });
});

describe("seasonLongScorer", () => {
  it("takes the latest league position/champion flag per team", () => {
    const rows = seasonLongScorer({
      scoringConfig: { winnerTakesAll: true, tiebreaker: "final_league_position" },
      assignments: [
        { participantId: "p1", potEntryId: "team_a" },
        { participantId: "p2", potEntryId: "team_b" },
      ],
      scoreEvents: [
        { subjectRef: "team_a", eventType: "points_award", payload: { leaguePosition: 5 }, recordedAt: 1 },
        { subjectRef: "team_a", eventType: "points_award", payload: { leaguePosition: 3 }, recordedAt: 2 },
        { subjectRef: "team_b", eventType: "points_award", payload: { leaguePosition: 1, isChampion: true }, recordedAt: 2 },
      ],
    });

    expect(rows).toEqual([
      { participantId: "p1", leaguePosition: 3, isChampion: false },
      { participantId: "p2", leaguePosition: 1, isChampion: true },
    ]);
  });
});

describe("standingsScorer", () => {
  const scoringConfig = {
    pointsTable: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
    bonusPoints: { fastestLap: 1 },
  };

  it("accumulates race points and bonuses across a season, ranked descending", () => {
    const rows = standingsScorer({
      scoringConfig,
      assignments: [
        { participantId: "p1", potEntryId: "driver_a" },
        { participantId: "p2", potEntryId: "driver_b" },
      ],
      scoreEvents: [
        { subjectRef: "driver_a", eventType: "race_result", payload: { finishingPosition: 2 }, recordedAt: 1 },
        { subjectRef: "driver_b", eventType: "race_result", payload: { finishingPosition: 1, bonuses: ["fastestLap"] }, recordedAt: 1 },
        { subjectRef: "driver_a", eventType: "race_result", payload: { finishingPosition: 1 }, recordedAt: 2 },
      ],
    });

    expect(rows).toEqual([
      { participantId: "p1", points: 43, rank: 1 },
      { participantId: "p2", points: 26, rank: 2 },
    ]);
  });
});

describe("computeStandingsSnapshot dispatch", () => {
  it("routes to the matching scorer per format_type", () => {
    const snapshot = computeStandingsSnapshot("standings", {
      scoringConfig: { pointsTable: [10] },
      assignments: [{ participantId: "p1", potEntryId: "driver_a" }],
      scoreEvents: [{ subjectRef: "driver_a", eventType: "race_result", payload: { finishingPosition: 1 }, recordedAt: 1 }],
    });
    expect(snapshot.formatType).toBe("standings");
    expect(snapshot.rows).toEqual([{ participantId: "p1", points: 10, rank: 1 }]);
  });
});
