
ALTER TABLE public.decks
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS decks_share_token_idx ON public.decks (share_token) WHERE share_token IS NOT NULL;

-- Public read RPC. Returns deck + slides + minimal brief data via SECURITY DEFINER,
-- so we can leave the base-table RLS locked down.
CREATE OR REPLACE FUNCTION public.get_shared_deck(_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    'id', _deck.id,
    'title', _deck.title,
    'brand_mode_id', _deck.brand_mode_id,
    'archetype_id', _deck.archetype_id,
    'sub_company', COALESCE(_deck.context->>'subCompany', _brief->>'sub_company'),
    'client_logo_url', _deck.context->>'clientLogoUrl',
    'shared_at', _deck.shared_at,
    'slides', _slides,
    'brief', _brief
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_shared_deck(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_deck(TEXT) TO anon, authenticated, service_role;
