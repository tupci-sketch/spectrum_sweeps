CREATE TABLE `account_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`permissions` text NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_types_name_idx` ON `account_types` (`name`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_mini_games` (
	`id` text PRIMARY KEY NOT NULL,
	`league_id` text,
	`name` text NOT NULL,
	`config` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_mini_games`("id", "league_id", "name", "config", "status", "created_at") SELECT "id", "league_id", "name", "config", "status", "created_at" FROM `mini_games`;--> statement-breakpoint
DROP TABLE `mini_games`;--> statement-breakpoint
ALTER TABLE `__new_mini_games` RENAME TO `mini_games`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `mini_game_entries` ADD `selection` integer;