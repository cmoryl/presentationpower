-- Share link lifecycle: expiry column + expiry-aware RPCs
ALTER TABLE public.decks ADD COLUMN IF NOT EXISTS share_expires_at timestamptz;

-- Update get_shared_deck to enforce expiry and return status
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

  -- Expiry gate: return status marker, never deck payload
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
    'shared_at', _deck.shared_at,
    'expires_at', _deck.share_expires_at,
    'slides', _slides,
    'brief', _brief
  );
END;
$function$;

-- Update record_share_view to refuse expired/invalid tokens
CREATE OR REPLACE FUNCTION public.record_share_view(_token text, _session_key text, _slides_viewed integer, _max_slide integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _deck_id uuid;
  _expires timestamptz;
  _session text;
  _existing uuid;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN
    RETURN;
  END IF;

  SELECT id, share_expires_at INTO _deck_id, _expires
    FROM public.decks WHERE share_token = _token LIMIT 1;
  IF _deck_id IS NULL THEN
    RETURN;
  END IF;
  IF _expires IS NOT NULL AND _expires <= now() THEN
    RETURN;
  END IF;

  _session := COALESCE(substr(_session_key, 1, 64), '');

  IF _session <> '' THEN
    SELECT id INTO _existing
    FROM public.deck_share_views
    WHERE deck_id = _deck_id
      AND session_key = _session
      AND viewed_at > now() - interval '4 hours'
    ORDER BY viewed_at DESC
    LIMIT 1;
  END IF;

  IF _existing IS NOT NULL THEN
    UPDATE public.deck_share_views
       SET slides_viewed = GREATEST(COALESCE(slides_viewed, 0), COALESCE(_slides_viewed, 0)),
           max_slide_reached = GREATEST(COALESCE(max_slide_reached, 0), COALESCE(_max_slide, 0)),
           viewed_at = now()
     WHERE id = _existing;
  ELSE
    INSERT INTO public.deck_share_views (deck_id, session_key, slides_viewed, max_slide_reached)
    VALUES (_deck_id, NULLIF(_session, ''), COALESCE(_slides_viewed, 0), COALESCE(_max_slide, 0));
  END IF;
END;
$function$;