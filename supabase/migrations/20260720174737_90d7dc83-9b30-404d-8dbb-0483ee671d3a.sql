
-- 1. Review workflow columns on decks
ALTER TABLE public.decks
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_note text;

ALTER TABLE public.decks DROP CONSTRAINT IF EXISTS decks_review_status_check;
ALTER TABLE public.decks ADD CONSTRAINT decks_review_status_check
  CHECK (review_status IN ('draft','in_review','approved','changes_requested'));

-- Allow admins to update review status (owner already can via existing policies)
DROP POLICY IF EXISTS "Admins can update review status" ON public.decks;
CREATE POLICY "Admins can update review status" ON public.decks
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can read all decks" ON public.decks;
CREATE POLICY "Admins can read all decks" ON public.decks
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. deck_comments
CREATE TABLE IF NOT EXISTS public.deck_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.deck_comments(id) ON DELETE CASCADE,
  slide_index integer,
  body text NOT NULL CHECK (length(body) > 0 AND length(body) <= 4000),
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deck_comments_deck_id_created_at_idx
  ON public.deck_comments(deck_id, created_at DESC);
CREATE INDEX IF NOT EXISTS deck_comments_deck_slide_idx
  ON public.deck_comments(deck_id, slide_index);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deck_comments TO authenticated;
GRANT ALL ON public.deck_comments TO service_role;

ALTER TABLE public.deck_comments ENABLE ROW LEVEL SECURITY;

-- Read: deck owner or any admin
CREATE POLICY "Owner or admin can read deck comments" ON public.deck_comments
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_comments.deck_id AND d.owner_id = auth.uid())
  );

-- Insert: must be authoring as self AND be owner or admin of that deck
CREATE POLICY "Owner or admin can post deck comments" ON public.deck_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_comments.deck_id AND d.owner_id = auth.uid())
    )
  );

-- Update: author edits own body/resolved; deck owner or admin can toggle resolved
CREATE POLICY "Author or deck owner or admin can update comments" ON public.deck_comments
  FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_comments.deck_id AND d.owner_id = auth.uid())
  )
  WITH CHECK (
    author_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_comments.deck_id AND d.owner_id = auth.uid())
  );

-- Delete: author, deck owner, or admin
CREATE POLICY "Author or deck owner or admin can delete comments" ON public.deck_comments
  FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_comments.deck_id AND d.owner_id = auth.uid())
  );

CREATE TRIGGER deck_comments_set_updated_at
  BEFORE UPDATE ON public.deck_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Profiles: authenticated users can read display names (needed for comment authorship)
DROP POLICY IF EXISTS "Authenticated can read profile display names" ON public.profiles;
CREATE POLICY "Authenticated can read profile display names" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);
