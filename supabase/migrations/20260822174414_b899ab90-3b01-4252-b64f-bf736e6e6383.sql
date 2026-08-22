CREATE TABLE public.social_asset_defaults (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edit_key text NOT NULL UNIQUE,
  patch jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.social_asset_defaults TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_asset_defaults TO authenticated;
GRANT ALL ON public.social_asset_defaults TO service_role;

ALTER TABLE public.social_asset_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read social asset defaults"
  ON public.social_asset_defaults FOR SELECT
  USING (true);

CREATE POLICY "Admins manage social asset defaults"
  ON public.social_asset_defaults FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER social_asset_defaults_updated_at
  BEFORE UPDATE ON public.social_asset_defaults
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();