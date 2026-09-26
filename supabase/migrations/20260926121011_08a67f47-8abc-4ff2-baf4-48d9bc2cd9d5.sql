REVOKE EXECUTE ON FUNCTION public.can_edit_venue(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_edit_venue(uuid) TO authenticated;