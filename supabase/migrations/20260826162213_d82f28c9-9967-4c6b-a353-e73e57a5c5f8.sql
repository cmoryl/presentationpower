CREATE TABLE public.next_city_badge_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  face TEXT NOT NULL DEFAULT 'dark',
  city_label TEXT NOT NULL DEFAULT '',
  dates_label TEXT NOT NULL DEFAULT '',
  venue_label TEXT NOT NULL DEFAULT '',
  role_label TEXT NOT NULL DEFAULT 'ATTENDEE',
  notes TEXT NOT NULL DEFAULT '',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT next_city_badge_versions_face_check CHECK (face IN ('dark','light')),
  CONSTRAINT next_city_badge_versions_status_check CHECK (status IN ('draft','approved','archived'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.next_city_badge_versions TO authenticated;
GRANT ALL ON public.next_city_badge_versions TO service_role;

ALTER TABLE public.next_city_badge_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read badge versions"
  ON public.next_city_badge_versions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create badge versions"
  ON public.next_city_badge_versions FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owners and admins can update badge versions"
  ON public.next_city_badge_versions FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners and admins can delete badge versions"
  ON public.next_city_badge_versions FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_next_city_badge_versions_updated_at
  BEFORE UPDATE ON public.next_city_badge_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();