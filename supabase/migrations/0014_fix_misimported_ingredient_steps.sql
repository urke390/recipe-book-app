-- 0014_fix_misimported_ingredient_steps.sql
-- Some imported recipes stored instruction sentences and sub-section
-- titles as 'ingredient_addition' steps (no quantity/unit), so they showed
-- up in the recipe's ingredient list. Convert them to what they really are.

-- 1. "__Title:__" rows -> section headers (same shape as existing headers).
update recipe_steps
set type = 'section_header',
    title = btrim(regexp_replace(ingredient_name, '^__\s*(.*?)\s*:?\s*__$', '\1')),
    notes = ingredient_name,
    ingredient_name = null,
    ingredient_id = null
where type = 'ingredient_addition'
  and base_quantity is null and unit is null
  and ingredient_name ~ '^__.*__$';

-- 2. Pure instruction sentences -> action steps.
with targets(recipe_name, ord) as (values
  ('מרק קובה סלק - בסגנון זאכו', 22), ('מרק קובה סלק - בסגנון זאכו', 23),
  ('מרק קובה סלק - בסגנון זאכו', 24), ('מרק קובה סלק - בסגנון זאכו', 25),
  ('מרק קובה סלק - בסגנון זאכו', 26), ('מרק קובה סלק - בסגנון זאכו', 27),
  ('מרק קובה סלק - בסגנון זאכו', 28), ('מרק קובה סלק - בסגנון זאכו', 44),
  ('מרק קובה סלק - בסגנון זאכו', 46),
  ('בצק לפיצה וחלה של אמא', 8), ('בצק לפיצה וחלה של אמא', 9),
  ('דג סול מטוגן', 0), ('דג סול מטוגן', 1), ('דג סול מטוגן', 2),
  ('כרוב חמוץ מינה', 2),
  ('לייקח פירות', 0), ('לייקח פירות', 1), ('לייקח פירות', 13),
  ('מאפיינס סבתא רחל', 0), ('מאפיינס סבתא רחל', 1),
  ('מצה קלויזה מיט ציטרונן קרם', 21),
  ('מרק בשר בגרסה אחרת', 17),
  ('סטיקים עם פילפלים', 11),
  ('עוגיות מרוקאיות של אמא של ערן', 11),
  ('עיג''ה סבא מאיר', 9),
  ('פילה אמנון אפוי', 4),
  ('צלי בקר (בראטן)', 4),
  ('שטרוייסל כוכן', 6)
)
update recipe_steps s
set type = 'action',
    title = s.ingredient_name,
    notes = null,
    ingredient_name = null,
    ingredient_id = null
from recipes r, targets t
where r.id = s.recipe_id
  and r.name = t.recipe_name and s."order" = t.ord
  and s.type = 'ingredient_addition'
  and s.base_quantity is null and s.unit is null;

-- 3. "1 כף גדושה מלח" was parsed as ingredient "גדושה מלח".
update recipe_steps
set ingredient_name = 'מלח', unit = 'כף גדושה'
where type = 'ingredient_addition' and ingredient_name = 'גדושה מלח' and unit = 'כף';
