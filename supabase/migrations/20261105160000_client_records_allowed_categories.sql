-- Pastas (categorias) a que cada cliente tem acesso. NULL = todas as pastas ativas.
alter table public.client_records
  add column if not exists allowed_categories text[];
