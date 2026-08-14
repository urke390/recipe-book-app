-- 0005_branding.sql -- lets an editor customize the app title and the two
-- colors that drive the header/buttons ("primary") and the page background,
-- from feedback notes asking for exactly this. Singleton row, same pattern
-- as app_secrets. Colors are stored as "H S% L%" (matching the CSS custom
-- property format already used in index.css), not hex, so they can be
-- applied directly via --primary / --background without conversion server-side.

create table app_branding (
  id boolean primary key default true,
  title text not null default 'ספר מתכונים ביתי',
  primary_color text not null default '152 48% 30%',
  background_color text not null default '40 33% 97%',
  constraint app_branding_singleton check (id)
);

insert into app_branding (id) values (true);

alter table app_branding enable row level security;
create policy "read_all" on app_branding for select to authenticated using (true);
create policy "editor_update" on app_branding for update to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');
