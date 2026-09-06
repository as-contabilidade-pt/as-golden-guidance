CREATE TABLE public.month_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nif text NOT NULL DEFAULT '',
  year integer NOT NULL,
  month integer NOT NULL,
  declaration_accepted boolean NOT NULL DEFAULT false,
  document_count integer NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, year, month)
);

GRANT SELECT, INSERT ON public.month_submissions TO authenticated;
GRANT ALL ON public.month_submissions TO service_role;

ALTER TABLE public.month_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own submissions" ON public.month_submissions
FOR SELECT TO authenticated
USING ((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own submissions" ON public.month_submissions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND declaration_accepted = true);

CREATE TRIGGER update_month_submissions_updated_at
BEFORE UPDATE ON public.month_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX month_submissions_submitted_at_idx ON public.month_submissions (submitted_at DESC);