CREATE POLICY "deck-exports: users read own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'deck-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "deck-exports: users insert own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'deck-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "deck-exports: users update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'deck-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "deck-exports: users delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'deck-exports' AND auth.uid()::text = (storage.foldername(name))[1]);