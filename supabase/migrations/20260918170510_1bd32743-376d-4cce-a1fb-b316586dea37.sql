CREATE POLICY "Signed-in colleagues can read venue photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'venue-photos');

CREATE POLICY "Signed-in colleagues can upload venue photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'venue-photos' AND owner = auth.uid());

CREATE POLICY "Owner or admin can replace venue photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'venue-photos' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (bucket_id = 'venue-photos' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Owner or admin can remove venue photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'venue-photos' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));