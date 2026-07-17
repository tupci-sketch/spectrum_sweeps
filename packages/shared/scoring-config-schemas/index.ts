import type { FormatType } from "../types/format-type";
import { knockoutScoringConfigSchema } from "./knockout";
import { seasonLongScoringConfigSchema } from "./season-long";
import { standingsScoringConfigSchema } from "./standings";

export * from "./knockout";
export * from "./season-long";
export * from "./standings";

const schemaByFormatType = {
  knockout: knockoutScoringConfigSchema,
  season_long: seasonLongScoringConfigSchema,
  standings: standingsScoringConfigSchema,
} as const;

export function scoringConfigSchemaFor(formatType: FormatType) {
  return schemaByFormatType[formatType];
}

// Throws a ZodError if invalid — call this whenever an admin saves a sport's scoring_config.
export function validateScoringConfig(formatType: FormatType, config: unknown) {
  return schemaByFormatType[formatType].parse(config);
}
