CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.custom_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  reference text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  best_fit text NOT NULL DEFAULT '',
  mode text NOT NULL DEFAULT 'light' CHECK (mode IN ('light','dark')),
  palette text[] NOT NULL,
  typography text NOT NULL DEFAULT '',
  surface_note text NOT NULL DEFAULT '',
  imagery text NOT NULL DEFAULT '',
  density text NOT NULL DEFAULT 'Medium',
  base_skin_code text,
  spec text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  notes text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.custom_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_templates TO authenticated;
GRANT ALL ON public.custom_templates TO service_role;
ALTER TABLE public.custom_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published templates are readable by anyone"
ON public.custom_templates FOR SELECT TO anon, authenticated
USING (status = 'published');

CREATE POLICY "Admins can read every template"
ON public.custom_templates FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create templates"
ON public.custom_templates FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update templates"
ON public.custom_templates FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete templates"
ON public.custom_templates FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_custom_templates_updated_at
BEFORE UPDATE ON public.custom_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.template_background_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skin_code text NOT NULL,
  scene text NOT NULL,
  intensity numeric NOT NULL DEFAULT 1 CHECK (intensity >= 0 AND intensity <= 2),
  tint text,
  tint_strength numeric NOT NULL DEFAULT 0 CHECK (tint_strength >= 0 AND tint_strength <= 1),
  scene_swap text,
  image_url text,
  note text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (skin_code, scene)
);

GRANT SELECT ON public.template_background_overrides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_background_overrides TO authenticated;
GRANT ALL ON public.template_background_overrides TO service_role;
ALTER TABLE public.template_background_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Background overrides are readable by anyone"
ON public.template_background_overrides FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Admins can create background overrides"
ON public.template_background_overrides FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update background overrides"
ON public.template_background_overrides FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete background overrides"
ON public.template_background_overrides FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_template_background_overrides_updated_at
BEFORE UPDATE ON public.template_background_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();