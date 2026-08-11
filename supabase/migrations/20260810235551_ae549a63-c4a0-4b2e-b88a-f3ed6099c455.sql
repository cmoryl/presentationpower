CREATE TABLE public.module_variant_sample_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variant_id TEXT NOT NULL,
  brand_mode_id TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  label TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_mvsv_lookup ON public.module_variant_sample_versions (variant_id, brand_mode_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.module_variant_sample_versions TO authenticated;
GRANT ALL ON public.module_variant_sample_versions TO service_role;

ALTER TABLE public.module_variant_sample_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sample versions"
  ON public.module_variant_sample_versions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create sample versions"
  ON public.module_variant_sample_versions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sample versions"
  ON public.module_variant_sample_versions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));