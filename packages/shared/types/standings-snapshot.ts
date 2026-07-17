import type { FormatType } from "./format-type";

export interface KnockoutStanding {
  participantId: string;
  roundReached: string;
  eliminated: boolean;
  points: number;
}

export interface SeasonLongStanding {
  participantId: string;
  leaguePosition: number | null;
  isChampion: boolean;
}

export interface StandingsStanding {
  participantId: string;
  points: number;
  rank: number;
}

export type StandingsRow = KnockoutStanding | SeasonLongStanding | StandingsStanding;

// This is the shape written into standings_snapshots.snapshot (JSON column).
// Leaderboard reads consume this directly — never recompute scoring on read.
export interface StandingsSnapshotPayload {
  formatType: FormatType;
  rows: StandingsRow[];
}
