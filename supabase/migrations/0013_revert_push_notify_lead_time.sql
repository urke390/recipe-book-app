-- 0013_revert_push_notify_lead_time.sql
-- Reverts 0012_push_notify_lead_time.sql.

drop policy "read_own" on push_subscriptions;
alter table push_subscriptions drop column notify_lead_seconds;
