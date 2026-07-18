// Pre-seed reference data. Team lists reflect a plausible current top flight /
// tournament field and are fully editable in the app later — the point is to
// have real, usable data to build sweepstakes from, not a locked source of truth.

export interface CatalogLeagueSeed {
  id: string;
  name: string;
  sportLabel: string;
  formatType: "knockout" | "season_long" | "standings";
  season: string;
  seasonStart: string;
  seasonEnd: string;
  // Teams to seed directly (nations for a tournament with no free feed). Empty
  // when teams come from an external source importer instead.
  teams: string[];
  // Official feed the teams/fixtures track against; the importer pulls real
  // fixtures + results from it (e.g. the Premier League's FPL API).
  externalSource: "fpl" | null;
}

export const officeGroupsSeed = [
  { id: "og_customer_services", name: "Customer Services", description: "Corey's department." },
];

export const catalogLeagues: CatalogLeagueSeed[] = [
  {
    // Real 2026/27 top flight: 2025/26 relegated West Ham, Burnley, Wolves;
    // promoted Coventry City (champions), Ipswich Town (2nd), Hull City
    // (play-off). Season starts 21 Aug 2026. Fixtures/results are tracked from
    // the Premier League's own FPL feed by the importer (empty until FPL rolls
    // over to 2026/27, then synced automatically).
    id: "cat_pl_2026_27",
    name: "Premier League 2026/27",
    sportLabel: "Football",
    formatType: "season_long",
    season: "2026/27",
    seasonStart: "2026-08-21",
    seasonEnd: "2027-05-23",
    externalSource: "fpl",
    teams: [
      "Arsenal",
      "Aston Villa",
      "Bournemouth",
      "Brentford",
      "Brighton & Hove Albion",
      "Chelsea",
      "Coventry City",
      "Crystal Palace",
      "Everton",
      "Fulham",
      "Hull City",
      "Ipswich Town",
      "Leeds United",
      "Liverpool",
      "Manchester City",
      "Manchester United",
      "Newcastle United",
      "Nottingham Forest",
      "Sunderland",
      "Tottenham Hotspur",
    ],
  },
  {
    id: "cat_rlwc_2026",
    name: "Rugby League World Cup 2026",
    sportLabel: "Rugby League",
    formatType: "knockout",
    season: "2026",
    seasonStart: "2026-10-24",
    seasonEnd: "2026-11-28",
    externalSource: null,
    teams: [
      "Australia",
      "New Zealand",
      "England",
      "Samoa",
      "Tonga",
      "Fiji",
      "Papua New Guinea",
      "France",
      "Wales",
      "Scotland",
      "Ireland",
      "Lebanon",
      "Jamaica",
      "Cook Islands",
      "Italy",
      "Greece",
    ],
  },
];
