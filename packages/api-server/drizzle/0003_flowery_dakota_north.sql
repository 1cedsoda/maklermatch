CREATE TABLE `search_quests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`category` text NOT NULL,
	`location` text NOT NULL,
	`is_private` integer,
	`min_interval_minutes` integer DEFAULT 30 NOT NULL,
	`max_interval_minutes` integer DEFAULT 60 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
