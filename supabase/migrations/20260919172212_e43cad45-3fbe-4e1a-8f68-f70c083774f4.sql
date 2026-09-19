CREATE TABLE public.brand_guide_edits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  division_id text NOT NULL,
  patch jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.brand_guide_edits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_guide_edits TO authenticated;
GRANT ALL ON public.brand_guide_edits TO service_role;

ALTER TABLE public.brand_guide_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_guide_edits_public_read" ON public.brand_guide_edits
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "brand_guide_edits_brand_write" ON public.brand_guide_edits
  FOR ALL TO authenticated
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

CREATE TRIGGER brand_guide_edits_set_updated_at
  BEFORE UPDATE ON public.brand_guide_edits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();