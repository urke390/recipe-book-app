-- 0008_recipe_user_notes.sql -- a free-text personal note per recipe,
-- editable from the interactive book viewer ("ספר מתכונים"). Separate from
-- `description` (a fixed one-line summary) - this is more like a margin
-- note ("added more cinnamon last time", "double the sugar").
alter table recipes add column notes text;
