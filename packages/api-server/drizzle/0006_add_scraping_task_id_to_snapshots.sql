ALTER TABLE `listing_abstract_snapshots` ADD `scraping_task_id` integer REFERENCES scraping_tasks(id);--> statement-breakpoint
ALTER TABLE `seller_snapshots` ADD `scraping_task_id` integer REFERENCES scraping_tasks(id);--> statement-breakpoint
ALTER TABLE `listing_detail_snapshots` ADD `scraping_task_id` integer REFERENCES scraping_tasks(id);
