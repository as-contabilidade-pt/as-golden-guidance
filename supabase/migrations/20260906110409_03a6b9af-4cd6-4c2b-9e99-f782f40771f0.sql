CREATE TYPE public.unlock_status AS ENUM ('pendente', 'aprovado', 'rejeitado', 'fechado');

CREATE TABLE public.unlock_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nif text NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  reason text NOT NULL,
  declaration_accepted boolean NOT NULL DEFAULT false,
  status public.unlock_status NOT NULL DEFAULT 'pendente',
  admin_note text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX unlock_requests_active_unique
  ON public.unlock_requests (user_id, year, month)
  WHERE status IN ('pendente', 'aprovado');

GRANT SELECT, INSERT, UPDATE ON public.unlock_requests TO authenticated;
GRANT ALL ON public.unlock_requests TO service_role;

ALTER TABLE public.unlock_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own unlock requests"
  ON public.unlock_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own unlock requests"
  ON public.unlock_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND declaration_accepted = true AND status = 'pendente');

CREATE POLICY "Admins update unlock requests"
  ON public.unlock_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_unlock_requests_updated_at
  BEFORE UPDATE ON public.unlock_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();