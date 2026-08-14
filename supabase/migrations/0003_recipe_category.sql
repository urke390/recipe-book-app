-- 0003_recipe_category.sql -- lets recipes be grouped into browsable
-- categories (e.g. "עוגות", "מרקים"), fully manageable (add/rename/delete)
-- like ingredient categories. Deliberately a separate table from
-- `categories`, which groups ingredients, not recipes - keeps the two
-- unrelated concepts from mixing in the same management UI.

create table recipe_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  "order" integer,
  created_at timestamptz not null default now()
);

alter table recipes add column category_id uuid references recipe_categories(id) on delete set null;
create index recipes_category_id_idx on recipes(category_id);

alter table recipe_categories enable row level security;
create policy "read_all" on recipe_categories for select to authenticated using (true);
create policy "editor_insert" on recipe_categories for insert to authenticated with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');
create policy "editor_update" on recipe_categories for update to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');
create policy "editor_delete" on recipe_categories for delete to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');
