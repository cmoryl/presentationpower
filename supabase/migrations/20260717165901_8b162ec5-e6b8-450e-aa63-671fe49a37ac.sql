
CREATE TABLE public.deck_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model text NOT NULL,
  overall_score integer NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  summary text NOT NULL DEFAULT '',
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deck_reviews TO authenticated;
GRANT ALL ON public.deck_reviews TO service_role;

ALTER TABLE public.deck_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own or deck-owner reviews"
  ON public.deck_reviews FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_id AND d.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'brand_reviewer'::app_role)
  );

CREATE POLICY "Users insert reviews for own decks"
  ON public.deck_reviews FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_id AND d.owner_id = auth.uid())
  );

CREATE POLICY "Users delete own reviews"
  ON public.deck_reviews FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE INDEX deck_reviews_deck_id_created_at_idx
  ON public.deck_reviews (deck_id, created_at DESC);
