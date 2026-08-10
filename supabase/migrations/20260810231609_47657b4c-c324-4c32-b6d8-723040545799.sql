CREATE TABLE public.module_variant_samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variant_id TEXT NOT NULL,
  brand_mode_id TEXT NOT NULL DEFAULT '*',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (variant_id, brand_mode_id)
);

GRANT SELECT ON public.module_variant_samples TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_variant_samples TO authenticated;
GRANT ALL ON public.module_variant_samples TO service_role;

ALTER TABLE public.module_variant_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read variant samples"
  ON public.module_variant_samples FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can write variant samples"
  ON public.module_variant_samples FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_module_variant_samples()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_module_variant_samples_updated_at
  BEFORE UPDATE ON public.module_variant_samples
  FOR EACH ROW EXECUTE FUNCTION public.touch_module_variant_samples();