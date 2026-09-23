CREATE TABLE public.event_map_floors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
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
  room_uses jsonb NOT NULL DEFAULT '{}'::jsonb,
  room_colours jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, floor_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_map_floors TO authenticated;
GRANT ALL ON public.event_map_floors TO service_role;
ALTER TABLE public.event_map_floors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read event map floors" ON public.event_map_floors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Venue editors add event map floors" ON public.event_map_floors FOR INSERT TO authenticated WITH CHECK (public.can_edit_venue(auth.uid()));
CREATE POLICY "Venue editors change event map floors" ON public.event_map_floors FOR UPDATE TO authenticated USING (public.can_edit_venue(auth.uid())) WITH CHECK (public.can_edit_venue(auth.uid()));
CREATE POLICY "Venue editors remove event map floors" ON public.event_map_floors FOR DELETE TO authenticated USING (public.can_edit_venue(auth.uid()));
CREATE TRIGGER event_map_floors_updated_at BEFORE UPDATE ON public.event_map_floors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();