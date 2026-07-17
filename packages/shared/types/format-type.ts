export const formatTypeValues = ["knockout", "season_long", "standings"] as const;
export type FormatType = (typeof formatTypeValues)[number];
