alter policy "Brand team can replace booth masters" on storage.objects
  with check (bucket_id = 'booth-masters' and (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'brand_lead') or public.has_role(auth.uid(),'brand_reviewer')));
alter policy "Signed-in users can upload skin backdrop images" on storage.objects
  with check (bucket_id = 'skin-backdrops' and public.has_any_role(auth.uid()));