-- Create companies table
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

-- Create zip code groups
CREATE TABLE `zip_code_groups` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `company_id` integer NOT NULL REFERENCES `companies`(`id`),
  `zip_codes` text NOT NULL,
  `active` integer DEFAULT true NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint

CREATE TABLE `zip_code_group_brokers` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `group_id` integer NOT NULL REFERENCES `zip_code_groups`(`id`),
  `broker_id` integer NOT NULL REFERENCES `brokers`(`id`)
);
--> statement-breakpoint

-- Restructure brokers: drop old columns, add company_id, phone, bio
CREATE TABLE `brokers_new` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `company_id` integer REFERENCES `companies`(`id`),
  `name` text NOT NULL,
  `phone` text,
  `email` text NOT NULL,
  `bio` text,
  `active` integer DEFAULT true NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint

INSERT INTO `brokers_new` (`id`, `name`, `phone`, `email`, `active`, `created_at`)
  SELECT `id`, `name`, `telefon`, `email`, `active`, `created_at` FROM `brokers`;
--> statement-breakpoint

DROP TABLE `brokers`;
--> statement-breakpoint

ALTER TABLE `brokers_new` RENAME TO `brokers`;
