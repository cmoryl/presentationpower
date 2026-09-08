-- Scope skin_backdrops writes to the creator or an admin
DROP POLICY IF EXISTS "Signed-in users can update skin backdrops" ON public.skin_backdrops;
DROP POLICY IF EXISTS "Signed-in users can remove skin backdrops" ON public.skin_backdrops;

CREATE POLICY "Owners or admins can update skin backdrops"
ON public.skin_backdrops FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners or admins can remove skin backdrops"
ON public.skin_backdrops FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- SECURITY DEFINER surface: revoke EXECUTE where the role has no legitimate need.
REVOKE EXECUTE ON FUNCTION public.get_template_deck(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.style_profile_aggregate(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.style_expansion_scan(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_admin_for_transperfect_domain() FROM anon, authenticated;