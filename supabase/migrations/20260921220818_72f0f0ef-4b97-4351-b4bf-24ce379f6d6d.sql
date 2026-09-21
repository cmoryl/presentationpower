CREATE TABLE public.venue_map_edits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_slug text NOT NULL,
  floor_id text NOT NULL,
  edits jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venue_slug, floor_id)
);

GRANT SELECT ON public.venue_map_edits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_map_edits TO authenticated;
GRANT ALL ON public.venue_map_edits TO service_role;

ALTER TABLE public.venue_map_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Map edits are readable by everyone"
ON public.venue_map_edits FOR SELECT
USING (true);

CREATE POLICY "Venue editors can add map edits"
ON public.venue_map_edits FOR INSERT TO authenticated
WITH CHECK (public.can_edit_venue(auth.uid()));

CREATE POLICY "Venue editors can change map edits"
ON public.venue_map_edits FOR UPDATE TO authenticated
USING (public.can_edit_venue(auth.uid()))
WITH CHECK (public.can_edit_venue(auth.uid()));

CREATE POLICY "Venue editors can clear map edits"
ON public.venue_map_edits FOR DELETE TO authenticated
USING (public.can_edit_venue(auth.uid()));

CREATE TRIGGER venue_map_edits_updated_at
BEFORE UPDATE ON public.venue_map_edits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();