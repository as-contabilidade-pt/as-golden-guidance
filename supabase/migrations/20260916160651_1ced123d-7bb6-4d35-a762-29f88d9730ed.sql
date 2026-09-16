CREATE TABLE public.client_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  client_number text NOT NULL DEFAULT '',
  name text NOT NULL,
  nif text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  locality text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  responsible_name text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  folder_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_records TO authenticated;
GRANT ALL ON public.client_records TO service_role;

ALTER TABLE public.client_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage client records" ON public.client_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients read own record" ON public.client_records FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE UNIQUE INDEX client_records_user_id_key ON public.client_records (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX client_records_name_idx ON public.client_records (name);
CREATE INDEX client_records_nif_idx ON public.client_records (nif);

CREATE TRIGGER update_client_records_updated_at BEFORE UPDATE ON public.client_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.client_records (user_id, name, nif, email, folder_active)
SELECT p.id, p.full_name, p.nif, p.email, true FROM public.profiles p;

ALTER TABLE public.documents
  ADD COLUMN late boolean NOT NULL DEFAULT false,
  ADD COLUMN late_submitted_at timestamp with time zone;

ALTER TABLE public.unlock_requests
  ADD COLUMN company_name text NOT NULL DEFAULT '',
  ADD COLUMN responsible_name text NOT NULL DEFAULT '',
  ADD COLUMN declaration_text text NOT NULL DEFAULT '';

ALTER TABLE public.month_submissions
  ADD COLUMN company_name text NOT NULL DEFAULT '',
  ADD COLUMN responsible_name text NOT NULL DEFAULT '',
  ADD COLUMN declaration_text text NOT NULL DEFAULT '';