CREATE POLICY "Authenticated can read brand-assets objects" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'brand-assets');

CREATE POLICY "Admins can insert brand-assets objects" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update brand-assets objects" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-assets' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'brand-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete brand-assets objects" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'brand-assets' AND has_role(auth.uid(), 'admin'::app_role));