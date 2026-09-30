REVOKE EXECUTE ON FUNCTION public.can_edit_signs(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_signs(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.sign_templates_guard() FROM PUBLIC, anon, authenticated;