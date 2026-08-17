CREATE TABLE public.custom_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  base_variant_id text NOT NULL,
  family_id text NOT NULL DEFAULT 'MF-08',
  section_id text,
  brand_mode text,
  tags text[] NOT NULL DEFAULT '{}',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  canvas_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  thumbnail_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_modules TO authenticated;
GRANT ALL ON public.custom_modules TO service_role;

ALTER TABLE public.custom_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read published custom modules"
  ON public.custom_modules FOR SELECT TO authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can create custom modules"
  ON public.custom_modules FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update custom modules"
  ON public.custom_modules FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete custom modules"
  ON public.custom_modules FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX custom_modules_status_idx ON public.custom_modules (status, updated_at DESC);

CREATE TRIGGER custom_modules_set_updated_at
  BEFORE UPDATE ON public.custom_modules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();