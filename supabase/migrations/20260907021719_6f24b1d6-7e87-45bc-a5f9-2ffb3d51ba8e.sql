CREATE POLICY "Booth masters are readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'booth-masters');

CREATE POLICY "Brand team can upload booth masters"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'booth-masters'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'brand_lead')
    OR public.has_role(auth.uid(), 'brand_reviewer')
  )
);

CREATE POLICY "Brand team can replace booth masters"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'booth-masters'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'brand_lead')
    OR public.has_role(auth.uid(), 'brand_reviewer')
  )
)
WITH CHECK (bucket_id = 'booth-masters');

CREATE POLICY "Brand team can delete booth masters"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'booth-masters'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'brand_lead')
  )
);