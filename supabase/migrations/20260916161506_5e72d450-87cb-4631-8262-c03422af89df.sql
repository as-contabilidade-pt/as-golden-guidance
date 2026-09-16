create or replace function public.verify_reminder_token(_token text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare v text;
begin
  select decrypted_secret into v from vault.decrypted_secrets where name = 'reminder_cron_secret';
  return v is not null and _token = v;
end $$;

revoke all on function public.verify_reminder_token(text) from public, anon, authenticated;
grant execute on function public.verify_reminder_token(text) to service_role;