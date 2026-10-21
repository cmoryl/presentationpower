CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid) TO authenticated;

DROP POLICY IF EXISTS "Authenticated can read client logos" ON public.client_logos;
CREATE POLICY "Team members read client logos" ON public.client_logos
  FOR SELECT TO authenticated USING (auth.uid() = created_by OR public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Signed-in read booth art" ON public.booth_art;
CREATE POLICY "Team members read booth art" ON public.booth_art
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read pdf_extractions" ON public.pdf_extractions;
CREATE POLICY "Editors read pdf_extractions" ON public.pdf_extractions
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_lead')
    OR public.has_role(auth.uid(),'brand_reviewer') OR public.has_role(auth.uid(),'content_owner'));

DROP POLICY IF EXISTS "Authenticated can read client-logos" ON storage.objects;
CREATE POLICY "Team members read client-logos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'client-logos' AND (owner = auth.uid() OR public.has_any_role(auth.uid())));