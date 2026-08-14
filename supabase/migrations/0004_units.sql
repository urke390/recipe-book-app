-- 0004_units.sql -- manageable units of measure (add/rename/delete), used by
-- the ingredient/step unit pickers instead of a hardcoded list in code.
-- `recipe_steps.unit` / `ingredients.default_unit` stay plain text columns
-- (not a foreign key) - a unit is just a label, and existing steps must keep
-- displaying correctly even if their unit is later renamed or deleted here.

create table units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  "order" integer,
  created_at timestamptz not null default now()
);

alter table units enable row level security;
create policy "read_all" on units for select to authenticated using (true);
create policy "editor_insert" on units for insert to authenticated with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');
create policy "editor_update" on units for update to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');
create policy "editor_delete" on units for delete to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');

-- Seeded with the original hardcoded list plus every unit string already
-- used by the imported recipe book, so no existing step shows up as
-- "unrecognized" in the picker.
insert into units (name, "order") values
  ('גרם', 0), ('גר''', 1), ('ק"ג', 2), ('קילו', 3), ('מ"ל', 4), ('ליטר', 5),
  ('יחידה', 6), ('כפית', 7), ('כפיות', 8), ('כף', 9), ('כפות', 10),
  ('כוס', 11), ('כוסות', 12), ('חבילה', 13), ('חבילות', 14),
  ('קופסה', 15), ('קופסת', 16), ('קופסאות', 17), ('שקית', 18), ('שקיות', 19),
  ('חתיכה', 20), ('חתיכות', 21), ('פרוסה', 22), ('פרוסות', 23),
  ('קורט', 24), ('מעט', 25);
