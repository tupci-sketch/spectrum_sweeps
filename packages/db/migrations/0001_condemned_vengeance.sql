-- DEFAULT 0 only satisfies SQLite's "NOT NULL ADD COLUMN needs a default"
-- rule; the competitions table is empty and every insert sets this explicitly,
-- so the default is never used for real data.
ALTER TABLE `competitions` ADD `target_entry_count` integer DEFAULT 0 NOT NULL;
