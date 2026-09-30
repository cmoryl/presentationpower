REVOKE EXECUTE ON FUNCTION public.guard_event_asset_publish() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_publish_event_assets(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_publish_event_assets(uuid) TO authenticated;