CREATE POLICY "Partners upload with a valid kit link" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'partner-submissions' AND public.is_valid_kit_share((storage.foldername(name))[1]));
CREATE POLICY "Event team reads partner uploads" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'partner-submissions' AND public.is_event_team(auth.uid()));