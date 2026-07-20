
-- Read-only RPC: shared-link viewers fetch translated content per position for a target language.
-- Validates the share token (and expiry) before returning any content.

CREATE OR REPLACE FUNCTION public.get_shared_deck_translations(_token text, _lang text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deck_id uuid;
  _expires timestamptz;
  _rows jsonb;
BEGIN
  IF _token IS NULL OR length(_token) < 16 OR _lang IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT id, share_expires_at INTO _deck_id, _expires
    FROM public.decks WHERE share_token = _token LIMIT 1;
  IF _deck_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  IF _expires IS NOT NULL AND _expires <= now() THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'position', ds.position,
           'content', st.translated_content
         ) ORDER BY ds.position), '[]'::jsonb)
    INTO _rows
    FROM public.deck_slides ds
    JOIN public.slide_translations st
      ON st.slide_id = ds.id AND st.target_lang = _lang AND st.status = 'ready'
   WHERE ds.deck_id = _deck_id;

  RETURN _rows;
END;
$$;

REVOKE ALL ON FUNCTION public.get_shared_deck_translations(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_deck_translations(text, text) TO anon, authenticated;
