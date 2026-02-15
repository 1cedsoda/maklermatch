ALTER TABLE `conversations` ADD `rejection_reason` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `last_snapshot_fetched_at` text;--> statement-breakpoint
ALTER TABLE `scheduled_sends` ADD `message_type` text;--> statement-breakpoint
ALTER TABLE `scheduled_sends` ADD `hours_delay` integer;
