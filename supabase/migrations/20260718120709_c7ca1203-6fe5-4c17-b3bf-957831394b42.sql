
CREATE TABLE public.deck_share_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  session_key text,
  slides_viewed int,
  max_slide_reached int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.deck_share_views TO authenticated;
GRANT ALL ON public.deck_share_views TO service_role;

ALTER TABLE public.deck_share_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view analytics for their decks"
ON public.deck_share_views
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.decks d
    WHERE d.id = deck_share_views.deck_id
      AND d.owner_id = auth.uid()
  )
);

CREATE INDEX deck_share_views_deck_id_idx ON public.deck_share_views(deck_id);
CREATE INDEX deck_share_views_session_idx ON public.deck_share_views(deck_id, session_key, viewed_at DESC);

CREATE TRIGGER deck_share_views_updated_at
BEFORE UPDATE ON public.deck_share_views
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.record_share_view(
  _token text,
  _session_key text,
  _slides_viewed int,
  _max_slide int
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deck_id uuid;
  _session text;
  _existing uuid;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN
    RETURN;
  END IF;

  SELECT id INTO _deck_id FROM public.decks WHERE share_token = _token LIMIT 1;
  IF _deck_id IS NULL THEN
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
$$;

GRANT EXECUTE ON FUNCTION public.record_share_view(text, text, int, int) TO anon, authenticated;
