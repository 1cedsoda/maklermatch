CREATE TABLE `brokers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`firma` text NOT NULL,
	`region` text NOT NULL,
	`spezialisierung` text,
	`erfahrung_jahre` integer,
	`provision` text,
	`arbeitsweise` text,
	`leistungen` text,
	`besonderheiten` text,
	`telefon` text,
	`email` text NOT NULL,
	`criteria_json` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `conversations` ADD `broker_email` text NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `kleinanzeigen_conversation_id` text;--> statement-breakpoint
ALTER TABLE `listing_abstract_snapshots` ADD `date_parsed` text;