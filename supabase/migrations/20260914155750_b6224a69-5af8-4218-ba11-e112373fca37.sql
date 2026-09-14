CREATE TABLE public.document_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_categories TO authenticated;
GRANT ALL ON public.document_categories TO service_role;

ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read categories" ON public.document_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert categories" ON public.document_categories
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update categories" ON public.document_categories
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete categories" ON public.document_categories
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_document_categories_updated_at
  BEFORE UPDATE ON public.document_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.document_categories (slug, label, position) VALUES
  ('faturas_compras', 'Faturas de Compras', 1),
  ('faturas_vendas', 'Faturas de Vendas', 2),
  ('extratos_bancarios', 'Extratos Bancários', 3),
  ('documentos_salarios', 'Documentos de Salários', 4),
  ('outros_documentos', 'Outros Documentos', 5);

ALTER TABLE public.documents ALTER COLUMN category TYPE text USING category::text;
ALTER TABLE public.documents ADD COLUMN supplier text NOT NULL DEFAULT '';
ALTER TABLE public.documents ADD COLUMN doc_date date;