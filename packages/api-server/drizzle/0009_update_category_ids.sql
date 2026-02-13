-- Migrate category values from slug strings to numeric ID strings
UPDATE search_quests SET category = '208' WHERE category = 'haus-zum-kauf';
