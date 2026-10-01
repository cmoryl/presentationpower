CREATE POLICY "Brand leads edit template decks" ON public.decks FOR UPDATE TO authenticated
  USING (is_template = true AND public.has_role(auth.uid(), 'brand_lead'))
  WITH CHECK (is_template = true AND public.has_role(auth.uid(), 'brand_lead'));

CREATE POLICY "Authenticated read template deck slides" ON public.deck_slides FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_slides.deck_id AND d.is_template = true));

CREATE POLICY "Brand leads edit template deck slides" ON public.deck_slides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'brand_lead') AND EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_slides.deck_id AND d.is_template = true))
  WITH CHECK (public.has_role(auth.uid(), 'brand_lead') AND EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_slides.deck_id AND d.is_template = true));

CREATE POLICY "slide-media: authenticated read masters" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'slide-media' AND (storage.foldername(name))[1] = 'masters');

CREATE POLICY "slide-media: admins and brand leads write masters" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'slide-media' AND (storage.foldername(name))[1] = 'masters'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'brand_lead')));