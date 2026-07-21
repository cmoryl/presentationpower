CREATE TABLE public.library_slide_examples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  division_id TEXT NOT NULL,
  brand_mode_id TEXT,
  imported_deck_id UUID REFERENCES public.imported_decks(id) ON DELETE SET NULL,
  slide_index INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT '',
  bullets TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  notes TEXT NOT NULL DEFAULT '',
  image_paths TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX library_slide_examples_division_idx
  ON public.library_slide_examples (division_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_slide_examples TO authenticated;
GRANT ALL ON public.library_slide_examples TO service_role;

ALTER TABLE public.library_slide_examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read library slide examples"
  ON public.library_slide_examples FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Signed-in users can submit library slide examples"
  ON public.library_slide_examples FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Owner or admin can update library slide examples"
  ON public.library_slide_examples FOR UPDATE
  TO authenticated
  USING (submitted_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (submitted_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner or admin can delete library slide examples"
  ON public.library_slide_examples FOR DELETE
  TO authenticated
  USING (submitted_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));