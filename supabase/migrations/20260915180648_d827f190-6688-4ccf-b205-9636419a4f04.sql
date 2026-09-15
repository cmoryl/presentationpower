CREATE TABLE public.venue_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  event_id text NOT NULL DEFAULT 'next',
  name text NOT NULL,
  city text NOT NULL DEFAULT '',
  venue text NOT NULL DEFAULT '',
  dates_label text NOT NULL DEFAULT '',
  producer text NOT NULL DEFAULT '',
  surveyed boolean NOT NULL DEFAULT false,
  survey_source text NOT NULL DEFAULT '',
  survey_date date,
  caveat text NOT NULL DEFAULT '',
  floors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_plans TO authenticated;
GRANT ALL ON public.venue_plans TO service_role;
ALTER TABLE public.venue_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read venue plans"
  ON public.venue_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in users can add venue plans"
  ON public.venue_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Signed-in users can edit venue plans"
  ON public.venue_plans FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Owner or admin can remove venue plans"
  ON public.venue_plans FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.venue_pins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_slug text NOT NULL,
  floor text NOT NULL,
  asset_id text NOT NULL,
  x numeric NOT NULL,
  y numeric NOT NULL,
  face text,
  confirmed boolean NOT NULL DEFAULT false,
  confirmed_by uuid,
  confirmed_at timestamptz,
  note text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venue_slug, asset_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_pins TO authenticated;
GRANT ALL ON public.venue_pins TO service_role;
ALTER TABLE public.venue_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read venue pins"
  ON public.venue_pins FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in users can add venue pins"
  ON public.venue_pins FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Signed-in users can move venue pins"
  ON public.venue_pins FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Owner or admin can remove venue pins"
  ON public.venue_pins FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX venue_pins_slug_floor_idx ON public.venue_pins (venue_slug, floor);

CREATE TRIGGER venue_plans_updated_at BEFORE UPDATE ON public.venue_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER venue_pins_updated_at BEFORE UPDATE ON public.venue_pins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();