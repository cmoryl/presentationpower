CREATE OR REPLACE FUNCTION public.get_shared_deck(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _deck public.decks%ROWTYPE;
  _slides JSONB;
  _brief JSONB;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO _deck FROM public.decks WHERE share_token = _token LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF _deck.share_expires_at IS NOT NULL AND _deck.share_expires_at <= now() THEN
    RETURN jsonb_build_object('status', 'expired');
  END IF;

  SELECT COALESCE(jsonb_agg(s ORDER BY s.position), '[]'::jsonb) INTO _slides
  FROM (
    SELECT position, section_id, variant_id, layout_id, content
    FROM public.deck_slides WHERE deck_id = _deck.id ORDER BY position
  ) s;

  IF _deck.brief_id IS NOT NULL THEN
    SELECT to_jsonb(b) INTO _brief FROM (
      SELECT prospect, industry, audience, brand_mode_id, sub_company
      FROM public.briefs WHERE id = _deck.brief_id
    ) b;
  END IF;

  RETURN jsonb_build_object(
    'status', 'active',
    'id', _deck.id,
    'title', _deck.title,
    'brand_mode_id', _deck.brand_mode_id,
    'archetype_id', _deck.archetype_id,
    'sub_company', COALESCE(_deck.context->>'subCompany', _brief->>'sub_company'),
    'client_logo_url', _deck.context->>'clientLogoUrl',
    'style_pack_id', _deck.context->>'stylePackId',
    'shared_at', _deck.shared_at,
    'expires_at', _deck.share_expires_at,
    'slides', _slides,
    'brief', _brief
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_shared_deck(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_deck(TEXT) TO anon, authenticated, service_role;