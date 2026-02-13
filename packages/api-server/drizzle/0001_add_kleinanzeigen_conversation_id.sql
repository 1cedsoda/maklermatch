ALTER TABLE `conversations` ADD COLUMN `kleinanzeigen_conversation_id` text;
ALTER TABLE `conversations` ADD COLUMN `broker_email` text NOT NULL DEFAULT '';