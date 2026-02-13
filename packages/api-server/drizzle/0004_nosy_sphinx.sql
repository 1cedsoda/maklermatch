ALTER TABLE `listing_abstract_snapshots` ADD `url` text;--> statement-breakpoint
ALTER TABLE `listing_detail_snapshots` ADD `seller_name` text;--> statement-breakpoint
ALTER TABLE `listing_detail_snapshots` ADD `seller_type` text;--> statement-breakpoint
ALTER TABLE `listings` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `search_quests` ADD `max_pages` integer;--> statement-breakpoint
ALTER TABLE `search_triggers` ADD `quest_id` integer REFERENCES search_quests(id);--> statement-breakpoint
ALTER TABLE `search_triggers` ADD `max_pages` integer;--> statement-breakpoint
ALTER TABLE `search_triggers` ADD `details_scraped` integer;--> statement-breakpoint
ALTER TABLE `search_triggers` ADD `details_failed` integer;