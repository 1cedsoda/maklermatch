ALTER TABLE search_quests RENAME TO search_targets;
ALTER TABLE scraping_tasks RENAME COLUMN quest_id TO target_id;
