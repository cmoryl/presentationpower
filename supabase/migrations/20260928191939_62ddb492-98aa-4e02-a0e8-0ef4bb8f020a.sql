DROP POLICY IF EXISTS "Booth template revisions are readable" ON public.booth_template_versions;
REVOKE SELECT ON public.booth_template_versions FROM anon;
CREATE POLICY "Brand team reads booth template revisions"
ON public.booth_template_versions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_lead') OR public.has_role(auth.uid(),'brand_reviewer'));