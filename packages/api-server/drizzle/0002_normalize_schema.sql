-- Rename listing_versions to listing_abstract_snapshots
ALTER TABLE `listing_versions` RENAME TO `listing_abstract_snapshots`;
--> statement-breakpoint
-- Drop the detail_page column (no longer stored on abstract versions)
ALTER TABLE `listing_abstract_snapshots` DROP COLUMN `detail_page`;
--> statement-breakpoint
-- Create sellers table
CREATE TABLE `sellers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`external_id` text NOT NULL,
	`first_seen` text NOT NULL,
	`last_seen` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sellers_external_id_unique` ON `sellers` (`external_id`);
--> statement-breakpoint
-- Create seller_snapshots table
CREATE TABLE `seller_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seller_id` integer NOT NULL,
	`previous_snapshot_id` integer,
	`name` text,
	`type` text,
	`active_since` text,
	`other_ads_count` integer,
	`seen_at` text NOT NULL,
	FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
-- Create listing_detail_snapshots table
CREATE TABLE `listing_detail_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` text NOT NULL,
	`previous_snapshot_id` integer,
	`description` text NOT NULL,
	`category` text,
	`image_urls` text NOT NULL,
	`details` text NOT NULL,
	`features` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`view_count` integer,
	`seller_id` integer,
	`seen_at` text NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON UPDATE no action ON DELETE no action
);
