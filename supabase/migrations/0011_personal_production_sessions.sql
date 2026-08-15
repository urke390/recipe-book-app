-- 0011_personal_production_sessions.sql
-- Guided production ("ייצור מודרך") becomes per-device: each anonymous
-- session only sees/controls the production sessions it started. Everything
-- else (recipes, categories, feedback notes, etc.) stays global/shared.

alter table production_sessions
  add column owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade;

drop policy "read_all" on production_sessions;
drop policy "public_insert" on production_sessions;
drop policy "public_update" on production_sessions;
drop policy "public_delete" on production_sessions;

create policy "read_own" on production_sessions for select to authenticated using (owner_id = auth.uid());
create policy "insert_own" on production_sessions for insert to authenticated with check (owner_id = auth.uid());
create policy "update_own" on production_sessions for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "delete_own" on production_sessions for delete to authenticated using (owner_id = auth.uid());

-- push_subscriptions keeps its existing open policies (the endpoint itself
-- is already the effective secret, and a device's anon identity can change
-- - e.g. on exiting editor mode - so re-subscribing must never get stuck
-- behind an ownership check on a row it no longer "owns"). owner_id here is
-- only used by the notify-overdue-timers Edge Function to target the right
-- device for a given session's push, not for RLS.
alter table push_subscriptions add column owner_id uuid default auth.uid();
