CREATE TABLE public.event_venue_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  event_id text NOT NULL DEFAULT 'next',
  city text NOT NULL DEFAULT '',
  venue text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  postcode text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  lat double precision,
  lng double precision,
  map_zoom integer NOT NULL DEFAULT 15,
  map_note text NOT NULL DEFAULT '',
  directions_url text NOT NULL DEFAULT '',
  opening_times jsonb NOT NULL DEFAULT '[]'::jsonb,
  travel jsonb NOT NULL DEFAULT '[]'::jsonb,
  photo_id text NOT NULL DEFAULT '',
  photo_path text NOT NULL DEFAULT '',
  photo_credit text NOT NULL DEFAULT '',
  wifi text NOT NULL DEFAULT '',
  support_email text NOT NULL DEFAULT '',
  site_url text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_venue_pages TO authenticated;
GRANT ALL ON public.event_venue_pages TO service_role;

ALTER TABLE public.event_venue_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in colleagues can read venue pages"
  ON public.event_venue_pages FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Signed-in colleagues can add venue pages"
  ON public.event_venue_pages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owner or admin can change venue pages"
  ON public.event_venue_pages FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner or admin can remove venue pages"
  ON public.event_venue_pages FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER event_venue_pages_updated_at
  BEFORE UPDATE ON public.event_venue_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX event_venue_pages_event_city_idx ON public.event_venue_pages (event_id, city);