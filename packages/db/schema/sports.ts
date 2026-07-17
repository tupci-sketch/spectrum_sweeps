import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { formatTypeValues } from "@spectrum-sweeps/shared";

export { formatTypeValues };
export type { FormatType } from "@spectrum-sweeps/shared";

// Shape validated by packages/shared/scoring-config-schemas (zod, keyed on format_type)
// before it's ever written here — this column intentionally stays untyped JSON at the DB layer.
export const sports = sqliteTable("sports", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  formatType: text("format_type", { enum: formatTypeValues }).notNull(),
  scoringConfig: text("scoring_config", { mode: "json" }).notNull().$type<Record<string, unknown>>(),
  icon: text("icon"),
  externalDataSource: text("external_data_source"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
