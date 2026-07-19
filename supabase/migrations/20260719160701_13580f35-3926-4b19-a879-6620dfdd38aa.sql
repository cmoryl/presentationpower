CREATE TABLE public.deck_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  snapshot jsonb NOT NULL,
  change_summary text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(deck_id, version_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deck_versions TO authenticated;
GRANT ALL ON public.deck_versions TO service_role;

ALTER TABLE public.deck_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deck owner reads versions"
  ON public.deck_versions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_id AND d.owner_id = auth.uid()));

CREATE POLICY "Deck owner inserts versions"
  ON public.deck_versions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_id AND d.owner_id = auth.uid()));

CREATE POLICY "Deck owner deletes versions"
  ON public.deck_versions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_id AND d.owner_id = auth.uid()));

CREATE INDEX deck_versions_deck_created_idx
  ON public.deck_versions (deck_id, created_at DESC);
CREATE INDEX deck_versions_deck_num_idx
  ON public.deck_versions (deck_id, version_number DESC);