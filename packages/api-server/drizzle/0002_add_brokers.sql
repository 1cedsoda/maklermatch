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
