CREATE TABLE `listing_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` text NOT NULL,
	`previous_version_id` integer,
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
	`seen_at` text NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`city` text NOT NULL,
	`url` text NOT NULL,
	`first_seen` text NOT NULL,
	`last_seen` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `search_triggers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`city` text NOT NULL,
	`triggered_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`pages_scraped` integer,
	`listings_found` integer,
	`error_message` text
);
