ALTER TABLE public.division_imagery
  ADD COLUMN IF NOT EXISTS collection text,
  ADD COLUMN IF NOT EXISTS template_kinds text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_default_for text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS division_imagery_template_kinds_idx
  ON public.division_imagery USING gin (template_kinds);
CREATE INDEX IF NOT EXISTS division_imagery_default_for_idx
  ON public.division_imagery USING gin (is_default_for);