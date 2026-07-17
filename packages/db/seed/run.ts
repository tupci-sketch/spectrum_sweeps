import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sportsCatalog } from "./sports-catalog";

// Generates seed/seed.sql from the TS catalog above. Apply it with:
//   wrangler d1 execute spectrum-sweeps-db --local --file=packages/db/seed/seed.sql
// (drop --local to seed a remote environment).

function sqlString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

const statements = sportsCatalog.map(
  (sport) =>
    `INSERT INTO sports (id, name, format_type, scoring_config, icon, created_at) VALUES (` +
    `${sqlString(sport.id)}, ${sqlString(sport.name)}, ${sqlString(sport.formatType)}, ` +
    `${sqlString(JSON.stringify(sport.scoringConfig))}, ${sqlString(sport.icon)}, unixepoch()) ` +
    `ON CONFLICT (id) DO UPDATE SET name = excluded.name, scoring_config = excluded.scoring_config;`,
);

const outPath = join(dirname(fileURLToPath(import.meta.url)), "seed.sql");
writeFileSync(outPath, statements.join("\n") + "\n");

console.log(`Wrote ${statements.length} seed statements to ${outPath}`);
