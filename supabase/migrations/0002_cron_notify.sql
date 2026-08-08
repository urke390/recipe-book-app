-- 0002_cron_notify.sql -- run AFTER deploying the notify-overdue-timers Edge Function.
--
-- IMPORTANT: before running this in the Supabase SQL Editor, replace both
-- placeholders below:
--   <PROJECT_REF>            -- Project Settings -> General -> Reference ID
--   <SUPABASE_SERVICE_ROLE_KEY> -- Project Settings -> API -> service_role key
-- cron.schedule's net.http_post call bakes these into the stored job body -
-- it cannot read environment variables at run time.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'notify-overdue-timers',
  '20 seconds',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/notify-overdue-timers',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SUPABASE_SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    )
  );
  $$
);
