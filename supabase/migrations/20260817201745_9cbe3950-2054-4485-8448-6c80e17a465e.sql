ALTER TABLE public.saved_modules
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_size bigint;

DROP POLICY IF EXISTS "slide files owner read" ON storage.objects;
CREATE POLICY "slide files owner read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'slide-files' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "slide files owner write" ON storage.objects;
CREATE POLICY "slide files owner write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'slide-files' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "slide files owner update" ON storage.objects;
CREATE POLICY "slide files owner update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'slide-files' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "slide files owner delete" ON storage.objects;
CREATE POLICY "slide files owner delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'slide-files' AND (storage.foldername(name))[1] = auth.uid()::text);