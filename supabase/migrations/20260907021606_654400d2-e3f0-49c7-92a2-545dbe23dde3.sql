CREATE TABLE public.booth_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  vendor text NOT NULL,
  venue text NOT NULL DEFAULT 'london-2026',
  style text NOT NULL DEFAULT '01-beam-violet-aqua',
  source_file text,
  master_path text,
  master_content_type text,
  proof_path text,
  trim_w numeric NOT NULL DEFAULT 1830,
  trim_h numeric NOT NULL DEFAULT 2440,
  bleed_mm numeric NOT NULL DEFAULT 100,
  trim_preset_id text,
  overlay jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  revision integer NOT NULL DEFAULT 1,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.booth_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booth_templates TO authenticated;
GRANT ALL ON public.booth_templates TO service_role;

ALTER TABLE public.booth_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active booth templates are readable"
ON public.booth_templates FOR SELECT
USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Brand team can create booth templates"
ON public.booth_templates FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'brand_lead')
  OR public.has_role(auth.uid(), 'brand_reviewer')
);

CREATE POLICY "Brand team can update booth templates"
ON public.booth_templates FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'brand_lead')
  OR public.has_role(auth.uid(), 'brand_reviewer')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'brand_lead')
  OR public.has_role(auth.uid(), 'brand_reviewer')
);

CREATE POLICY "Brand team can delete booth templates"
ON public.booth_templates FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'brand_lead')
);

CREATE TABLE public.booth_template_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.booth_templates(id) ON DELETE CASCADE,
  revision integer NOT NULL,
  snapshot jsonb NOT NULL,
  note text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (template_id, revision)
);

GRANT SELECT ON public.booth_template_versions TO anon;
GRANT SELECT, INSERT ON public.booth_template_versions TO authenticated;
GRANT ALL ON public.booth_template_versions TO service_role;

ALTER TABLE public.booth_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Booth template revisions are readable"
ON public.booth_template_versions FOR SELECT
USING (true);

CREATE POLICY "Brand team can record booth template revisions"
ON public.booth_template_versions FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'brand_lead')
  OR public.has_role(auth.uid(), 'brand_reviewer')
);

CREATE TRIGGER booth_templates_set_updated_at
BEFORE UPDATE ON public.booth_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX booth_templates_venue_order_idx ON public.booth_templates (venue, sort_order);