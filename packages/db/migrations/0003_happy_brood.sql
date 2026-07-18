ALTER TABLE `competitions` ADD `draw_state` text DEFAULT 'not_scheduled' NOT NULL;--> statement-breakpoint
ALTER TABLE `competitions` ADD `draw_scheduled_at` integer;--> statement-breakpoint
ALTER TABLE `competitions` ADD `draw_seed` text;--> statement-breakpoint
ALTER TABLE `competitions` ADD `draw_started_by_user_id` text;