CREATE TABLE public.print_page_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  scope TEXT NOT NULL DEFAULT 'private' CHECK (scope IN ('private','shared')),
  title TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL DEFAULT 'case-study',
  division_id TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  thumbnail_url TEXT,
  source_asset_id UUID,
  source_library_item_id TEXT,
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.print_page_templates TO authenticated;
GRANT ALL ON public.print_page_templates TO service_role;

ALTER TABLE public.print_page_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own or shared page templates"
  ON public.print_page_templates FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR scope = 'shared');

CREATE POLICY "Create own page templates"
  ON public.print_page_templates FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND (scope = 'private' OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Update own page templates or admin"
  ON public.print_page_templates FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (scope = 'private' OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Delete own page templates or admin"
  ON public.print_page_templates FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX print_page_templates_scope_idx ON public.print_page_templates (scope, updated_at DESC);
CREATE INDEX print_page_templates_owner_idx ON public.print_page_templates (owner_id, updated_at DESC);

CREATE TRIGGER print_page_templates_set_updated_at
  BEFORE UPDATE ON public.print_page_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();