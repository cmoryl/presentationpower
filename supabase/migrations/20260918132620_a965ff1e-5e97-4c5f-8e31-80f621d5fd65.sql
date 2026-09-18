CREATE TABLE public.event_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  event_id TEXT NOT NULL DEFAULT 'next',
  city TEXT NOT NULL DEFAULT '',
  year INTEGER NOT NULL DEFAULT 2026,
  size_id TEXT NOT NULL DEFAULT 'a4',
  notes TEXT NOT NULL DEFAULT '',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_guides TO authenticated;
GRANT ALL ON public.event_guides TO service_role;
ALTER TABLE public.event_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in colleagues can read guides" ON public.event_guides
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in colleagues can create guides" ON public.event_guides
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owners and admins can change guides" ON public.event_guides
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins can remove guides" ON public.event_guides
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER event_guides_set_updated_at BEFORE UPDATE ON public.event_guides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.event_guide_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID NOT NULL REFERENCES public.event_guides(id) ON DELETE CASCADE,
  rev INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  config JSONB NOT NULL,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (guide_id, rev)
);

GRANT SELECT, INSERT ON public.event_guide_versions TO authenticated;
GRANT ALL ON public.event_guide_versions TO service_role;
ALTER TABLE public.event_guide_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in colleagues can read guide history" ON public.event_guide_versions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in colleagues can add guide snapshots" ON public.event_guide_versions
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());