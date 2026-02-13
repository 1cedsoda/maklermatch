CREATE TABLE `scraping_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quest_id` integer NOT NULL REFERENCES search_quests(id),
	`started_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`max_pages` integer,
	`pages_scraped` integer,
	`listings_found` integer,
	`details_scraped` integer,
	`details_failed` integer,
	`error_message` text
);--> statement-breakpoint
INSERT INTO `scraping_tasks` (`id`, `quest_id`, `started_at`, `status`, `max_pages`, `pages_scraped`, `listings_found`, `details_scraped`, `details_failed`, `error_message`)
	SELECT `id`, `quest_id`, `triggered_at`, `status`, `max_pages`, `pages_scraped`, `listings_found`, `details_scraped`, `details_failed`, `error_message`
	FROM `search_triggers`
	WHERE `quest_id` IS NOT NULL;--> statement-breakpoint
DROP TABLE `search_triggers`;
