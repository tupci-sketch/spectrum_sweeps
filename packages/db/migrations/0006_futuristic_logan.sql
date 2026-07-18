PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`league_id` text,
	`competition_id` text,
	`user_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_chat_messages`("id", "league_id", "competition_id", "user_id", "body", "created_at") SELECT "id", "league_id", "competition_id", "user_id", "body", "created_at" FROM `chat_messages`;--> statement-breakpoint
DROP TABLE `chat_messages`;--> statement-breakpoint
ALTER TABLE `__new_chat_messages` RENAME TO `chat_messages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_forum_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`league_id` text,
	`title` text NOT NULL,
	`created_by` text NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_forum_threads`("id", "league_id", "title", "created_by", "pinned", "created_at") SELECT "id", "league_id", "title", "created_by", "pinned", "created_at" FROM `forum_threads`;--> statement-breakpoint
DROP TABLE `forum_threads`;--> statement-breakpoint
ALTER TABLE `__new_forum_threads` RENAME TO `forum_threads`;--> statement-breakpoint
CREATE TABLE `__new_polls` (
	`id` text PRIMARY KEY NOT NULL,
	`league_id` text,
	`question` text NOT NULL,
	`options` text NOT NULL,
	`created_by` text NOT NULL,
	`closes_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`league_id`) REFERENCES `leagues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_polls`("id", "league_id", "question", "options", "created_by", "closes_at", "created_at") SELECT "id", "league_id", "question", "options", "created_by", "closes_at", "created_at" FROM `polls`;--> statement-breakpoint
DROP TABLE `polls`;--> statement-breakpoint
ALTER TABLE `__new_polls` RENAME TO `polls`;