CREATE TABLE public.globallink_config (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  project_code TEXT,
  workflow TEXT NOT NULL DEFAULT 'mt' CHECK (workflow IN ('mt','mt_pe','human')),
  default_source_lang TEXT NOT NULL DEFAULT 'en',
  submitter_override TEXT,
  human_review_default BOOLEAN NOT NULL DEFAULT false,
  use_translation_memory BOOLEAN NOT NULL DEFAULT true,
  enforce_glossary BOOLEAN NOT NULL DEFAULT true,
  callback_url TEXT,
  batch_size INTEGER NOT NULL DEFAULT 100 CHECK (batch_size BETWEEN 1 AND 500),
  request_timeout_ms INTEGER NOT NULL DEFAULT 60000 CHECK (request_timeout_ms BETWEEN 5000 AND 600000),
  notes TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.globallink_config TO authenticated;
GRANT ALL ON public.globallink_config TO service_role;

ALTER TABLE public.globallink_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view GlobalLink config"
  ON public.globallink_config FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert GlobalLink config"
  ON public.globallink_config FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update GlobalLink config"
  ON public.globallink_config FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER globallink_config_set_updated_at
  BEFORE UPDATE ON public.globallink_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.globallink_config (id) VALUES (true) ON CONFLICT DO NOTHING;