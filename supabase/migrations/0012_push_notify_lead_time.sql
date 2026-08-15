-- 0012_push_notify_lead_time.sql
-- Lets each device choose when its push notification fires relative to a
-- wait-timer's actual end: at the moment it ends (0s, the existing
-- behavior) or a configurable lead time before that (e.g. 60s early).

alter table push_subscriptions add column notify_lead_seconds integer not null default 0;

-- The client needs to read back its own subscription's current preference
-- (to show it as selected) - previously there was no SELECT policy at all
-- since nothing needed to read this table client-side.
create policy "read_own" on push_subscriptions for select to authenticated using (owner_id = auth.uid());
