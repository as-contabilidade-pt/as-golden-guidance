CREATE TABLE IF NOT EXISTS public.statement_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  client_name text NOT NULL DEFAULT '',
  filename text NOT NULL DEFAULT '',
  source_document_id uuid,
  rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  row_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.statement_conversions TO authenticated;
GRANT ALL ON public.statement_conversions TO service_role;
ALTER TABLE public.statement_conversions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "statement_conversions_admin_all" ON public.statement_conversions;
DROP POLICY IF EXISTS "Admins manage statement conversions" ON public.statement_conversions;
CREATE POLICY "Admins manage statement conversions" ON public.statement_conversions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));