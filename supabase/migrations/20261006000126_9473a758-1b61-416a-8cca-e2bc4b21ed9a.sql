REVOKE EXECUTE ON FUNCTION public.get_event_booths(text) FROM anon, authenticated, public;
DROP FUNCTION public.get_event_booths(text);