CREATE TABLE public.event_intake_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  item_key text NOT NULL,
  status text NOT NULL DEFAULT 'missing' CHECK (status IN ('missing','received','scan','found_online','not_needed')),
  note text,
  file_path text,
  source_url text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, item_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_intake_items TO authenticated;
GRANT ALL ON public.event_intake_items TO service_role;
ALTER TABLE public.event_intake_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read intake" ON public.event_intake_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Venue editors insert intake" ON public.event_intake_items FOR INSERT TO authenticated WITH CHECK (public.can_edit_venue(auth.uid()));
CREATE POLICY "Venue editors update intake" ON public.event_intake_items FOR UPDATE TO authenticated USING (public.can_edit_venue(auth.uid())) WITH CHECK (public.can_edit_venue(auth.uid()));
CREATE POLICY "Venue editors delete intake" ON public.event_intake_items FOR DELETE TO authenticated USING (public.can_edit_venue(auth.uid()));
CREATE TRIGGER event_intake_items_updated BEFORE UPDATE ON public.event_intake_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.event_venue_research (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  item_key text NOT NULL,
  label text NOT NULL,
  value text NOT NULL,
  source_url text NOT NULL,
  source_title text,
  status text NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested','confirmed','rejected')),
  query text,
  created_by uuid,
  confirmed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_venue_research_event_idx ON public.event_venue_research (event_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_venue_research TO authenticated;
GRANT ALL ON public.event_venue_research TO service_role;
ALTER TABLE public.event_venue_research ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read research" ON public.event_venue_research FOR SELECT TO authenticated USING (true);
CREATE POLICY "Venue editors insert research" ON public.event_venue_research FOR INSERT TO authenticated WITH CHECK (public.can_edit_venue(auth.uid()));
CREATE POLICY "Venue editors update research" ON public.event_venue_research FOR UPDATE TO authenticated USING (public.can_edit_venue(auth.uid())) WITH CHECK (public.can_edit_venue(auth.uid()));
CREATE POLICY "Venue editors delete research" ON public.event_venue_research FOR DELETE TO authenticated USING (public.can_edit_venue(auth.uid()));
CREATE TRIGGER event_venue_research_updated BEFORE UPDATE ON public.event_venue_research FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();