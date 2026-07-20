CREATE OR REPLACE FUNCTION public.get_shared_deck_locales(_token text)
RETURNS TABLE(target_lang text, ready integer, total integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _deck_id uuid; _expires timestamptz;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN RETURN; END IF;
  SELECT id, share_expires_at INTO _deck_id, _expires FROM public.decks WHERE share_token = _token LIMIT 1;
  IF _deck_id IS NULL THEN RETURN; END IF;
  IF _expires IS NOT NULL AND _expires <= now() THEN RETURN; END IF;
  RETURN QUERY
    SELECT st.target_lang,
           COUNT(*) FILTER (WHERE st.status = 'ready')::int AS ready,
           COUNT(*)::int AS total
    FROM public.slide_translations st
    JOIN public.deck_slides ds ON ds.id = st.slide_id
    WHERE ds.deck_id = _deck_id
    GROUP BY st.target_lang
    HAVING COUNT(*) FILTER (WHERE st.status = 'ready') > 0
    ORDER BY st.target_lang;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_shared_deck_locales(text) TO anon, authenticated;