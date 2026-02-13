CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`quest_id` integer NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`price` text,
	`price_parsed` real,
	`location` text,
	`distance` text,
	`date` text,
	`image_url` text,
	`image_count` integer DEFAULT 0 NOT NULL,
	`is_private` integer DEFAULT false NOT NULL,
	`tags` text NOT NULL,
	`first_seen` text NOT NULL,
	`last_seen` text NOT NULL,
	FOREIGN KEY (`quest_id`) REFERENCES `search_quests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `search_quests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`city` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `search_triggers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quest_id` integer NOT NULL,
	`triggered_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`pages_scraped` integer,
	`listings_found` integer,
	`error_message` text,
	FOREIGN KEY (`quest_id`) REFERENCES `search_quests`(`id`) ON UPDATE no action ON DELETE no action
);
