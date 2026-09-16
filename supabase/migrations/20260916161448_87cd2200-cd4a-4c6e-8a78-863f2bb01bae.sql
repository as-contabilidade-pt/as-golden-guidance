drop extension if exists pg_net;
create schema if not exists extensions;
create extension pg_net with schema extensions;
grant usage on schema extensions to postgres, service_role;

select cron.unschedule('lembrete-documentacao-dia-8')
where exists (select 1 from cron.job where jobname = 'lembrete-documentacao-dia-8');

select cron.schedule(
  'lembrete-documentacao-dia-8',
  '0 8 8 * *',
  $$
  select extensions.net.http_post(
    url := 'https://project--c28c1f98-ed40-4a06-adf9-6946926d86b9.lovable.app/api/public/lembrete-documentacao',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'reminder_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);