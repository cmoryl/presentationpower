
ALTER TABLE public.decks ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_decks_is_template ON public.decks (is_template) WHERE is_template = true;

DROP POLICY IF EXISTS "Authenticated can view team templates" ON public.decks;
CREATE POLICY "Authenticated can view team templates"
  ON public.decks FOR SELECT
  TO authenticated
  USING (is_template = true);

CREATE OR REPLACE FUNCTION public.get_template_deck(_deck_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _deck public.decks%ROWTYPE;
  _slides jsonb;
  _brief jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO _deck FROM public.decks WHERE id = _deck_id AND is_template = true LIMIT 1;
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
      SELECT prospect, industry, audience, brand_mode_id, sub_company, meeting_objective, length_target, known_facts
      FROM public.briefs WHERE id = _deck.brief_id
    ) b;
  END IF;

  RETURN jsonb_build_object(
    'id', _deck.id,
    'title', _deck.title,
    'brand_mode_id', _deck.brand_mode_id,
    'archetype_id', _deck.archetype_id,
    'sub_company', COALESCE(_deck.context->>'subCompany', _brief->>'sub_company'),
    'context', _deck.context,
    'slides', _slides,
    'brief', _brief
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_template_deck(uuid) TO authenticated;
