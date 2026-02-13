CREATE TABLE `conversations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` text NOT NULL REFERENCES listings(id),
	`broker_id` text NOT NULL,
	`seller_name` text,
	`kleinanzeigen_reply_to` text,
	`email_subject` text,
	`status` text DEFAULT 'active' NOT NULL,
	`current_stage` text DEFAULT 'initial' NOT NULL,
	`reply_sentiment` text,
	`first_contact_at` text,
	`last_message_at` text,
	`next_followup_at` text,
	`created_at` text NOT NULL
);--> statement-breakpoint
CREATE TABLE `conversation_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversation_id` integer NOT NULL REFERENCES conversations(id),
	`direction` text NOT NULL,
	`channel` text NOT NULL,
	`body` text NOT NULL,
	`stage` text,
	`spam_guard_score` real,
	`kleinanzeigen_address` text,
	`sent_at` text NOT NULL
);--> statement-breakpoint
CREATE TABLE `inbound_emails` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_address` text NOT NULL,
	`to_address` text NOT NULL,
	`subject` text,
	`body_text` text,
	`body_html` text,
	`conversation_id` integer REFERENCES conversations(id),
	`processed` integer DEFAULT false NOT NULL,
	`received_at` text NOT NULL
);--> statement-breakpoint
CREATE TABLE `scheduled_sends` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversation_id` integer NOT NULL REFERENCES conversations(id),
	`message` text NOT NULL,
	`send_after` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL
);
