
CREATE TABLE public.pdf_extractions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_slug TEXT NOT NULL,
  entity_name TEXT,
  section TEXT,
  title TEXT NOT NULL,
  category TEXT,
  description TEXT,
  source_url TEXT NOT NULL UNIQUE,
  thumbnail_url TEXT,
  source TEXT,
  content_hash TEXT,
  extracted_text TEXT,
  char_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  extracted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX pdf_extractions_entity_idx ON public.pdf_extractions (entity_type, entity_slug);
CREATE INDEX pdf_extractions_status_idx ON public.pdf_extractions (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_extractions TO authenticated;
GRANT ALL ON public.pdf_extractions TO service_role;

ALTER TABLE public.pdf_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read pdf_extractions"
  ON public.pdf_extractions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert pdf_extractions"
  ON public.pdf_extractions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update pdf_extractions"
  ON public.pdf_extractions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete pdf_extractions"
  ON public.pdf_extractions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER pdf_extractions_set_updated_at
  BEFORE UPDATE ON public.pdf_extractions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
