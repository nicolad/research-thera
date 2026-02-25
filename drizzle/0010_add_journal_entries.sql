CREATE TABLE IF NOT EXISTS `journal_entries` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL,
  `family_member_id` integer REFERENCES `family_members`(`id`) ON DELETE SET NULL,
  `title` text,
  `content` text NOT NULL,
  `mood` text,
  `mood_score` integer,
  `tags` text,
  `goal_id` integer REFERENCES `goals`(`id`) ON DELETE SET NULL,
  `is_private` integer NOT NULL DEFAULT 1,
  `entry_date` text NOT NULL,
  `created_at` text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` text NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS `idx_journal_entries_user_id` ON `journal_entries` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_journal_entries_entry_date` ON `journal_entries` (`entry_date`);
CREATE INDEX IF NOT EXISTS `idx_journal_entries_mood` ON `journal_entries` (`mood`);
CREATE INDEX IF NOT EXISTS `idx_journal_entries_goal_id` ON `journal_entries` (`goal_id`);
