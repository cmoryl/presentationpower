
ALTER TABLE public.slide_modules
  ADD COLUMN IF NOT EXISTS reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS content_hash text;

CREATE INDEX IF NOT EXISTS slide_modules_content_hash_idx
  ON public.slide_modules(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS slide_modules_approval_status_idx
  ON public.slide_modules(approval_status);
CREATE INDEX IF NOT EXISTS slide_modules_expires_at_idx
  ON public.slide_modules(expires_at) WHERE expires_at IS NOT NULL;

-- Reviewers/admins can list and update approval fields on all slide modules.
DROP POLICY IF EXISTS "Reviewers read all slide_modules" ON public.slide_modules;
CREATE POLICY "Reviewers read all slide_modules" ON public.slide_modules
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_reviewer'));

DROP POLICY IF EXISTS "Reviewers update slide_modules" ON public.slide_modules;
CREATE POLICY "Reviewers update slide_modules" ON public.slide_modules
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_reviewer'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_reviewer'));
