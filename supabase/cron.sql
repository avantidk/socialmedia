-- Run AFTER deploying. Replace YOUR_PROJECT_REF and YOUR_CRON_SECRET, then run in the SQL Editor.
-- Enables scheduled posting (every minute) and analytics sync (every 3 hours), all free.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('publish-due-posts', '* * * * *', $$
  select net.http_get(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/api/cron/publish',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET'),
    timeout_milliseconds := 60000);
$$);

select cron.schedule('sync-analytics', '0 */3 * * *', $$
  select net.http_get(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/api/cron/sync',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET'),
    timeout_milliseconds := 60000);
$$);
