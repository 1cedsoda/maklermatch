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
ALTER TABLE `listings` DROP COLUMN `title`;--> statement-breakpoint
ALTER TABLE `listings` DROP COLUMN `description`;--> statement-breakpoint
ALTER TABLE `listings` DROP COLUMN `price`;--> statement-breakpoint
ALTER TABLE `listings` DROP COLUMN `price_parsed`;--> statement-breakpoint
ALTER TABLE `listings` DROP COLUMN `location`;--> statement-breakpoint
ALTER TABLE `listings` DROP COLUMN `distance`;--> statement-breakpoint
ALTER TABLE `listings` DROP COLUMN `date`;--> statement-breakpoint
ALTER TABLE `listings` DROP COLUMN `image_url`;--> statement-breakpoint
ALTER TABLE `listings` DROP COLUMN `image_count`;--> statement-breakpoint
ALTER TABLE `listings` DROP COLUMN `is_private`;--> statement-breakpoint
ALTER TABLE `listings` DROP COLUMN `tags`;