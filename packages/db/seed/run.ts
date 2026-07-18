import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sportsCatalog } from "./sports-catalog";
import { officeGroupsSeed, catalogLeagues } from "./catalog-data";

// Generates seed/seed.sql from the TS catalogs. Apply it with:
//   wrangler d1 execute spectrum-sweeps-db --local --file=packages/db/seed/seed.sql
// (drop --local to seed a remote environment). All inserts are idempotent
// (ON CONFLICT), so re-running is safe.

function s(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}
function ts(dateStr: string) {
  return `${Math.floor(new Date(dateStr).getTime() / 1000)}`;
}

const statements: string[] = [];

// Sports
for (const sport of sportsCatalog) {
  statements.push(
    `INSERT INTO sports (id, name, format_type, scoring_config, icon, created_at) VALUES (` +
      `${s(sport.id)}, ${s(sport.name)}, ${s(sport.formatType)}, ${s(JSON.stringify(sport.scoringConfig))}, ${s(sport.icon)}, unixepoch()) ` +
      `ON CONFLICT (id) DO UPDATE SET name = excluded.name, scoring_config = excluded.scoring_config;`,
  );
}

// Office groups / departments
for (const og of officeGroupsSeed) {
  statements.push(
    `INSERT INTO office_groups (id, name, description, created_at) VALUES (${s(og.id)}, ${s(og.name)}, ${s(og.description)}, unixepoch()) ` +
      `ON CONFLICT (id) DO UPDATE SET name = excluded.name, description = excluded.description;`,
  );
}

// Catalog leagues + team names. Fixtures/results are NOT seeded here — they're
// pulled from the official source by the importer (see server/catalog). Team
// names are seeded so draw pools are ready pre-season; the importer reconciles
// them with the feed (adding crests/external refs) once it goes live.
let teamCount = 0;
for (const league of catalogLeagues) {
  statements.push(
    `INSERT INTO catalog_leagues (id, name, sport_label, format_type, season, season_start, season_end, external_source, created_at) VALUES (` +
      `${s(league.id)}, ${s(league.name)}, ${s(league.sportLabel)}, ${s(league.formatType)}, ${s(league.season)}, ${ts(league.seasonStart)}, ${ts(league.seasonEnd)}, ${league.externalSource ? s(league.externalSource) : "NULL"}, unixepoch()) ` +
      `ON CONFLICT (id) DO UPDATE SET name = excluded.name, season = excluded.season, external_source = excluded.external_source, season_start = excluded.season_start;`,
  );

  const teamIds = league.teams.map((_, i) => `${league.id}_team_${String(i).padStart(2, "0")}`);
  league.teams.forEach((team, i) => {
    statements.push(
      `INSERT INTO catalog_teams (id, catalog_league_id, name, sort_order) VALUES (${s(teamIds[i])}, ${s(league.id)}, ${s(team)}, ${i}) ` +
        `ON CONFLICT (id) DO UPDATE SET name = excluded.name;`,
    );
    teamCount++;
  });
}

const outPath = join(dirname(fileURLToPath(import.meta.url)), "seed.sql");
writeFileSync(outPath, statements.join("\n") + "\n");

console.log(
  `Wrote ${statements.length} seed statements (${sportsCatalog.length} sports, ${officeGroupsSeed.length} office groups, ${catalogLeagues.length} catalog leagues, ${teamCount} teams) to ${outPath}`,
);
