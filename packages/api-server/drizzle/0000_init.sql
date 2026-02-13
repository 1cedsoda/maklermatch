CREATE TABLE `brokers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer,
	`name` text NOT NULL,
	`phone` text,
	`email` text NOT NULL,
	`bio` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`description` text,
	`billing_street` text,
	`billing_street_2` text,
	`billing_city` text,
	`billing_zip_code` text,
	`billing_country` text DEFAULT 'Deutschland',
	`ust_id` text,
	`iban` text,
	`bic` text,
	`bank_name` text,
	`min_price` integer,
	`max_price` integer,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `conversation_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversation_id` integer NOT NULL,
	`direction` text NOT NULL,
	`channel` text NOT NULL,
	`body` text NOT NULL,
	`stage` text,
	`spam_guard_score` real,
	`kleinanzeigen_address` text,
	`sent_at` text NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` text NOT NULL,
	`broker_id` text NOT NULL,
	`broker_email` text NOT NULL,
	`seller_name` text,
	`kleinanzeigen_conversation_id` text,
	`kleinanzeigen_reply_to` text,
	`email_subject` text,
	`status` text DEFAULT 'active' NOT NULL,
	`current_stage` text DEFAULT 'initial' NOT NULL,
	`reply_sentiment` text,
	`first_contact_at` text,
	`last_message_at` text,
	`next_followup_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inbound_emails` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_address` text NOT NULL,
	`to_address` text NOT NULL,
	`subject` text,
	`body_text` text,
	`body_html` text,
	`conversation_id` integer,
	`processed` integer DEFAULT false NOT NULL,
	`received_at` text NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `listing_abstract_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` text NOT NULL,
	`previous_version_id` integer,
	`url` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`price` text,
	`price_parsed` real,
	`location` text,
	`distance` text,
	`date` text,
	`date_parsed` text,
	`image_url` text,
	`image_count` integer DEFAULT 0 NOT NULL,
	`is_private` integer DEFAULT false NOT NULL,
	`tags` text NOT NULL,
	`seen_at` text NOT NULL,
	`scraping_task_id` integer,
	`html` text,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scraping_task_id`) REFERENCES `scraping_tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
	`seller_name` text,
	`seller_type` text,
	`seen_at` text NOT NULL,
	`scraping_task_id` integer,
	`html` text,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scraping_task_id`) REFERENCES `scraping_tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`city` text NOT NULL,
	`url` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`first_seen` text NOT NULL,
	`last_seen` text NOT NULL,
	`detail_page_scraped_at` text
);
--> statement-breakpoint
CREATE TABLE `scheduled_sends` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversation_id` integer NOT NULL,
	`message` text NOT NULL,
	`send_after` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `scraping_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`target_id` integer NOT NULL,
	`started_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`max_pages` integer,
	`pages_scraped` integer,
	`listings_found` integer,
	`details_scraped` integer,
	`details_failed` integer,
	`error_message` text,
	`error_logs` text,
	FOREIGN KEY (`target_id`) REFERENCES `search_targets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `search_targets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`category` text NOT NULL,
	`location` text NOT NULL,
	`is_private` integer,
	`max_pages` integer,
	`min_interval_minutes` integer DEFAULT 30 NOT NULL,
	`max_interval_minutes` integer DEFAULT 60 NOT NULL,
	`sorting` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `seller_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seller_id` integer NOT NULL,
	`previous_snapshot_id` integer,
	`name` text,
	`type` text,
	`active_since` text,
	`other_ads_count` integer,
	`seen_at` text NOT NULL,
	`scraping_task_id` integer,
	FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scraping_task_id`) REFERENCES `scraping_tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sellers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`external_id` text NOT NULL,
	`first_seen` text NOT NULL,
	`last_seen` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sellers_external_id_unique` ON `sellers` (`external_id`);--> statement-breakpoint
CREATE TABLE `zip_code_group_brokers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`broker_id` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `zip_code_groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`broker_id`) REFERENCES `brokers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `zip_code_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`zip_codes` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
