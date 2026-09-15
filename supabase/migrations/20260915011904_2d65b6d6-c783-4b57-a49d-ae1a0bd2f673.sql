CREATE TABLE public.event_booklets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL DEFAULT 'next',
  city TEXT NOT NULL DEFAULT 'london',
  year INTEGER NOT NULL,
  name TEXT NOT NULL,
  size_id TEXT NOT NULL DEFAULT 'a4',
  config JSONB NOT NULL,
  agenda JSONB,
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_booklets TO authenticated;
GRANT ALL ON public.event_booklets TO service_role;

ALTER TABLE public.event_booklets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view saved booklets"
  ON public.event_booklets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Signed-in users can save booklets"
  ON public.event_booklets FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners and admins can update booklets"
  ON public.event_booklets FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners and admins can delete booklets"
  ON public.event_booklets FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX event_booklets_event_city_year_idx
  ON public.event_booklets (event_id, city, year DESC, updated_at DESC);

CREATE TRIGGER event_booklets_set_updated_at
  BEFORE UPDATE ON public.event_booklets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();