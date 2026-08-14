-- 0007_nightly_production_cleanup.sql -- clears every guided-production
-- session nightly, per feedback: abandoned "ייצור מודרך" sessions from
-- earlier in the day shouldn't still be sitting there the next morning.
-- Scheduled at 01:00 UTC, i.e. ~3:00 Israel time in winter (IST, UTC+2) and
-- ~4:00 in summer (IDT, UTC+3) - pg_cron runs in UTC with no DST awareness,
-- so an exact year-round 3am match isn't possible without extra tooling;
-- this is close enough for a housekeeping job nobody is watching the clock
-- for.
create extension if not exists pg_cron;

select cron.schedule(
  'nightly-production-cleanup',
  '0 1 * * *',
  $$ delete from production_sessions $$
);
