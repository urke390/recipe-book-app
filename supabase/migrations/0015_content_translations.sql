-- Spanish translations of user content (recipe names, steps, units,
-- categories, parameters, branding title). Content stays stored in Hebrew;
-- this maps each distinct Hebrew source string to its Spanish rendering.
-- Read by every client in Spanish mode (src/lib/contentI18n.js); written by
-- editors and by the translate-content edge function (service role).

create table if not exists content_translations (
  source text primary key,
  es text not null,
  origin text not null default 'manual' check (origin in ('manual', 'auto')),
  updated_at timestamptz not null default now()
);

alter table content_translations enable row level security;
create policy "read_all" on content_translations for select to authenticated using (true);
create policy "editor_insert" on content_translations for insert to authenticated with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');
create policy "editor_update" on content_translations for update to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');
create policy "editor_delete" on content_translations for delete to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');

grant select, insert, update, delete on content_translations to authenticated;
grant all on content_translations to service_role;

-- Per-device notification language (timer pushes are sent in it).
alter table push_subscriptions add column if not exists lang text not null default 'he';
