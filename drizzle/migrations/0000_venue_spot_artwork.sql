ALTER TABLE public.venue_sign_spots DROP CONSTRAINT IF EXISTS venue_sign_spots_kind_check;
ALTER TABLE public.venue_sign_spots ADD CONSTRAINT venue_sign_spots_kind_check CHECK (kind IN ('door','column','wall','room_sign','directional','header','kiosk','floor','stair','other'));
ALTER TABLE public.venue_sign_spots
  ADD COLUMN IF NOT EXISTS artwork_path text,
  ADD COLUMN IF NOT EXISTS artwork_name text,
  ADD COLUMN IF NOT EXISTS artboards jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS review jsonb,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_event_id text;
CREATE POLICY "Signed-in users read venue artwork" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'venue-artwork');
CREATE POLICY "Venue editors upload venue artwork" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'venue-artwork' AND public.can_edit_venue(auth.uid()));
CREATE POLICY "Venue editors remove venue artwork" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'venue-artwork' AND public.can_edit_venue(auth.uid()));