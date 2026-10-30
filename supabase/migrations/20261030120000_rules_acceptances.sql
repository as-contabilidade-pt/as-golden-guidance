-- Registo da aceitação das regras de entrega de documentação por cada cliente.
create table if not exists public.rules_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version text not null,
  rules_text text not null,
  accepted_at timestamptz not null default now(),
  unique (user_id, version)
);

alter table public.rules_acceptances enable row level security;

grant select, insert on public.rules_acceptances to authenticated;
grant all on public.rules_acceptances to service_role;

drop policy if exists "Users read own rules acceptance" on public.rules_acceptances;
create policy "Users read own rules acceptance" on public.rules_acceptances
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users insert own rules acceptance" on public.rules_acceptances;
create policy "Users insert own rules acceptance" on public.rules_acceptances
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Admins read rules acceptances" on public.rules_acceptances;
create policy "Admins read rules acceptances" on public.rules_acceptances
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
