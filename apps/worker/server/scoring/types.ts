// Framework-agnostic scoring engine types. Scorers take plain data in and
// plain data out — no DB or Worker runtime dependency — so they're easy to
// unit test with fixtures (see plan doc verification section).

// subjectRef on a score event is always a pot_entry id (the team/driver/
// constructor), never a participant id — results are entered about the
// thing that plays (a team, a driver), and get attributed to whichever
// participant drew that pot_entry via the assignments join.
export interface ScoreEventInput {
  subjectRef: string;
  eventType: "match_result" | "round_elimination" | "race_result" | "points_award";
  payload: Record<string, unknown>;
  recordedAt: number;
}

export interface AssignmentInput {
  participantId: string;
  potEntryId: string;
}

export interface ScorerInput {
  scoringConfig: Record<string, unknown>;
  scoreEvents: ScoreEventInput[];
  assignments: AssignmentInput[];
}

export interface KnockoutRow {
  participantId: string;
  roundReached: string;
  eliminated: boolean;
  points: number;
}

export interface SeasonLongRow {
  participantId: string;
  leaguePosition: number | null;
  isChampion: boolean;
}

export interface StandingsRow {
  participantId: string;
  points: number;
  rank: number;
}

export type Scorer<Row> = (input: ScorerInput) => Row[];
