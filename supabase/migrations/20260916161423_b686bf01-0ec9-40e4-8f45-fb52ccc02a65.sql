create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare v_secret text;
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'reminder_cron_secret') then
    v_secret := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    perform vault.create_secret(v_secret, 'reminder_cron_secret', 'Chave da tarefa de lembrete de documentação');
  end if;
end $$;

select cron.unschedule('lembrete-documentacao-dia-8')
where exists (select 1 from cron.job where jobname = 'lembrete-documentacao-dia-8');

select cron.schedule(
  'lembrete-documentacao-dia-8',
  '0 8 8 * *',
  $$
  select net.http_post(
    url := 'https://project--c28c1f98-ed40-4a06-adf9-6946926d86b9.lovable.app/api/public/lembrete-documentacao',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'reminder_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);