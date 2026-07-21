
CREATE POLICY "slide-videos: users read own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'slide-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "slide-videos: users insert own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'slide-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "slide-videos: users update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'slide-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "slide-videos: users delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'slide-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
