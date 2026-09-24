CREATE TABLE public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  city text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  timezone text NOT NULL DEFAULT '',
  logo_path text,
  source_note text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venues TO authenticated;
GRANT ALL ON public.venues TO service_role;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read venues" ON public.venues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Venue editors add venues" ON public.venues FOR INSERT TO authenticated WITH CHECK (public.can_edit_venue(auth.uid()));
CREATE POLICY "Venue editors change venues" ON public.venues FOR UPDATE TO authenticated USING (public.can_edit_venue(auth.uid())) WITH CHECK (public.can_edit_venue(auth.uid()));
CREATE POLICY "Venue editors remove venues" ON public.venues FOR DELETE TO authenticated USING (public.can_edit_venue(auth.uid()));
CREATE TRIGGER venues_updated_at BEFORE UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.venue_floors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  floor_key text NOT NULL,
  marker text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  source_kind text NOT NULL DEFAULT 'vector' CHECK (source_kind IN ('vector','scan')),
  source_name text,
  w double precision NOT NULL,
  h double precision NOT NULL,
  shapes jsonb NOT NULL DEFAULT '[]'::jsonb,
  labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  off_plan_labels text[] NOT NULL DEFAULT '{}',
  wall_closures jsonb NOT NULL DEFAULT '[]'::jsonb,
  splits jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venue_id, floor_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_floors TO authenticated;
GRANT ALL ON public.venue_floors TO service_role;
ALTER TABLE public.venue_floors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read venue floors" ON public.venue_floors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Venue editors add venue floors" ON public.venue_floors FOR INSERT TO authenticated WITH CHECK (public.can_edit_venue(auth.uid()));
CREATE POLICY "Venue editors change venue floors" ON public.venue_floors FOR UPDATE TO authenticated USING (public.can_edit_venue(auth.uid())) WITH CHECK (public.can_edit_venue(auth.uid()));
CREATE POLICY "Venue editors remove venue floors" ON public.venue_floors FOR DELETE TO authenticated USING (public.can_edit_venue(auth.uid()));
CREATE TRIGGER venue_floors_updated_at BEFORE UPDATE ON public.venue_floors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.event_venues (
  event_id text PRIMARY KEY,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE RESTRICT,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_venues TO authenticated;
GRANT ALL ON public.event_venues TO service_role;
ALTER TABLE public.event_venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read event venues" ON public.event_venues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Venue editors add event venues" ON public.event_venues FOR INSERT TO authenticated WITH CHECK (public.can_edit_venue(auth.uid()));
CREATE POLICY "Venue editors change event venues" ON public.event_venues FOR UPDATE TO authenticated USING (public.can_edit_venue(auth.uid())) WITH CHECK (public.can_edit_venue(auth.uid()));
CREATE POLICY "Venue editors remove event venues" ON public.event_venues FOR DELETE TO authenticated USING (public.can_edit_venue(auth.uid()));
CREATE TRIGGER event_venues_updated_at BEFORE UPDATE ON public.event_venues FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.event_map_floors ADD COLUMN venue_floor_id uuid REFERENCES public.venue_floors(id) ON DELETE SET NULL;
ALTER TABLE public.event_map_floors ALTER COLUMN w DROP NOT NULL;
ALTER TABLE public.event_map_floors ALTER COLUMN h DROP NOT NULL;