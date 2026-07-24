PRAGMA defer_foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text,
	`email` text,
	`nickname` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'participant' NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`account_type` text DEFAULT 'participant' NOT NULL,
	`office_group_id` text,
	`avatar_url` text,
	`bhive_employee_id` text,
	`password_hash` text,
	`bio` text,
	`status` text DEFAULT 'invited' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`office_group_id`) REFERENCES `office_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "full_name", "email", "nickname", "display_name", "role", "level", "account_type", "office_group_id", "avatar_url", "bhive_employee_id", "password_hash", "bio", "status", "created_at") SELECT "id", NULL, "email", "nickname", "display_name", "role", "level", "account_type", "office_group_id", "avatar_url", "bhive_employee_id", "password_hash", "bio", "status", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA defer_foreign_keys=OFF;