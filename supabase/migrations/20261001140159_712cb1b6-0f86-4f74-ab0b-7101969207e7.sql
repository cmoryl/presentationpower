CREATE TABLE public.event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  path text NOT NULL UNIQUE,
  thumb_path text NOT NULL,
  original_name text NOT NULL,
  album text NOT NULL,
  division text,
  room text,
  sign_kind text,
  sign_kind_source text NOT NULL DEFAULT 'auto' CHECK (sign_kind_source IN ('auto','checked')),
  panel_id text,
  print_note text,
  width int,
  height int,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_photos_event_idx ON public.event_photos (event_id, division);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_photos TO authenticated;
GRANT ALL ON public.event_photos TO service_role;

ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in staff view event photos" ON public.event_photos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sign editors add event photos" ON public.event_photos
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_signs(auth.uid()));
CREATE POLICY "Sign editors label event photos" ON public.event_photos
  FOR UPDATE TO authenticated USING (public.can_edit_signs(auth.uid())) WITH CHECK (public.can_edit_signs(auth.uid()));
CREATE POLICY "Sign editors remove event photos" ON public.event_photos
  FOR DELETE TO authenticated USING (public.can_edit_signs(auth.uid()));

CREATE TRIGGER event_photos_touch BEFORE UPDATE ON public.event_photos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Signed-in staff read event photo files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'event-photos');
CREATE POLICY "Sign editors upload event photo files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-photos' AND public.can_edit_signs(auth.uid()));
CREATE POLICY "Sign editors delete event photo files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'event-photos' AND public.can_edit_signs(auth.uid()));