CREATE TABLE public.deck_slide_captures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id uuid NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  slide_id text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  variant_id text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('light','dark')),
  fingerprint text NOT NULL,
  plate text NOT NULL,
  runs jsonb NOT NULL DEFAULT '[]'::jsonb,
  shapes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deck_id, slide_id, mode)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deck_slide_captures TO authenticated;
GRANT ALL ON public.deck_slide_captures TO service_role;

ALTER TABLE public.deck_slide_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deck owners manage their slide captures"
ON public.deck_slide_captures
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_id AND d.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_id AND d.owner_id = auth.uid()));

CREATE INDEX deck_slide_captures_deck_idx ON public.deck_slide_captures (deck_id);

CREATE TRIGGER deck_slide_captures_updated_at
BEFORE UPDATE ON public.deck_slide_captures
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();