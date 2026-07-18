CREATE TABLE `catalog_fixtures` (
	`id` text PRIMARY KEY NOT NULL,
	`catalog_league_id` text NOT NULL,
	`matchweek` integer NOT NULL,
	`stage` text,
	`home_team_id` text NOT NULL,
	`away_team_id` text NOT NULL,
	`kickoff_at` integer,
	`home_score` integer,
	`away_score` integer,
	`played` integer DEFAULT false NOT NULL,
	`external_ref` text,
	FOREIGN KEY (`catalog_league_id`) REFERENCES `catalog_leagues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `catalog_leagues` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sport_label` text NOT NULL,
	`format_type` text NOT NULL,
	`season` text NOT NULL,
	`season_start` integer,
	`season_end` integer,
	`external_source` text,
	`last_synced_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `catalog_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`catalog_league_id` text NOT NULL,
	`name` text NOT NULL,
	`short_name` text,
	`crest_url` text,
	`competitor_number` integer,
	`external_ref` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`catalog_league_id`) REFERENCES `catalog_leagues`(`id`) ON UPDATE no action ON DELETE no action
);
