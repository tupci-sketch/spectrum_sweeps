import type { FormatType, StandingsSnapshotPayload } from "@spectrum-sweeps/shared";
import { knockoutScorer } from "./knockout";
import { seasonLongScorer } from "./season-long";
import { standingsScorer } from "./standings";
import type { ScorerInput } from "./types";

export * from "./types";
export { knockoutScorer, seasonLongScorer, standingsScorer };

// Adding a new sport under an existing format_type is config-only (edit
// scoring_config). Adding a genuinely new format_type means one new scorer
// function here — an acceptable, rare cost given the product fixes 3 types.
export function computeStandingsSnapshot(formatType: FormatType, input: ScorerInput): StandingsSnapshotPayload {
  switch (formatType) {
    case "knockout":
      return { formatType, rows: knockoutScorer(input) };
    case "season_long":
      return { formatType, rows: seasonLongScorer(input) };
    case "standings":
      return { formatType, rows: standingsScorer(input) };
  }
}
