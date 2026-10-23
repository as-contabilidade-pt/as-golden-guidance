-- Hardening da base de dados de produção (idempotente).
-- Executar manualmente no editor SQL da base de dados de produção.
-- Pode ser corrido várias vezes sem efeitos secundários.

-- 1. Auditoria ---------------------------------------------------------------
create table if not exists public.audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor uuid,
  table_name text not null,
  action text not null,
  row_id text,
  old_data jsonb,
  new_data jsonb
);
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
drop policy if exists "audit admin read" on public.audit_log;
create policy "audit admin read" on public.audit_log
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.log_audit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log(actor, table_name, action, row_id, old_data, new_data)
  values (
    auth.uid(), tg_table_name, tg_op,
    coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id')),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['user_roles','month_submissions','unlock_requests','client_records'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_audit_%1$s on public.%1$s', t);
      execute format('create trigger trg_audit_%1$s after insert or update or delete on public.%1$s
                      for each row execute function public.log_audit()', t);
    end if;
  end loop;
end $$;

-- 2. Proteção de campos sensíveis em profiles --------------------------------
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') and auth.role() <> 'service_role' then
    new.id := old.id;
    new.nif := old.nif;
    new.email := old.email;
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_profile on public.profiles;
create trigger trg_protect_profile before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- 3. user_roles: só admins alteram cargos ------------------------------------
alter table public.user_roles enable row level security;
drop policy if exists "roles self read" on public.user_roles;
create policy "roles self read" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
drop policy if exists "roles admin write" on public.user_roles;
create policy "roles admin write" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 4. contact_messages: inserção pública limitada, leitura só admin -----------
alter table public.contact_messages enable row level security;
drop policy if exists "contact public insert" on public.contact_messages;
create policy "contact public insert" on public.contact_messages
  for insert to anon, authenticated with check (
    char_length(first_name) between 1 and 80 and
    char_length(last_name) between 1 and 80 and
    char_length(email) between 3 and 255 and
    char_length(message) between 5 and 2000
  );
drop policy if exists "contact admin read" on public.contact_messages;
create policy "contact admin read" on public.contact_messages
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 5. Bucket de documentos: só PDF, até 10 MB, cada cliente na sua pasta -------
update storage.buckets
  set file_size_limit = 10485760, allowed_mime_types = array['application/pdf'], public = false
  where id = 'documentos';

drop policy if exists "docs own folder read" on storage.objects;
create policy "docs own folder read" on storage.objects
  for select to authenticated using (
    bucket_id = 'documentos' and (
      (storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin')
    )
  );
drop policy if exists "docs own folder write" on storage.objects;
create policy "docs own folder write" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'documentos' and (
      (storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin')
    )
  );
drop policy if exists "docs own folder delete" on storage.objects;
create policy "docs own folder delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'documentos' and (
      (storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin')
    )
  );

-- Nota: o conteúdo real do PDF não pode ser validado por RLS (só tipo e tamanho).
