CREATE TABLE public.module_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('print','deck')),
  module_id TEXT NOT NULL,
  label TEXT,
  description TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  density TEXT,
  best_for TEXT[],
  hidden BOOLEAN NOT NULL DEFAULT false,
  content JSONB,
  notes TEXT,
  updated_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope, module_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_overrides TO authenticated;
GRANT ALL ON public.module_overrides TO service_role;

ALTER TABLE public.module_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "module_overrides_read" ON public.module_overrides
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "module_overrides_insert" ON public.module_overrides
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "module_overrides_update" ON public.module_overrides
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "module_overrides_delete" ON public.module_overrides
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER module_overrides_updated_at BEFORE UPDATE ON public.module_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();