
-- RLS policies for the private slide-media bucket. Users can only access files
-- under a top-level folder named for their own auth.uid().
CREATE POLICY "slide-media: users can read own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'slide-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "slide-media: users can upload own files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'slide-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "slide-media: users can update own files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'slide-media' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'slide-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "slide-media: users can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'slide-media' AND (storage.foldername(name))[1] = auth.uid()::text);
