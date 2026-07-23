ALTER TABLE public.division_imagery
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

CREATE INDEX IF NOT EXISTS division_imagery_approved_idx
  ON public.division_imagery (division_id, approved, created_at DESC);