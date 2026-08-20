ALTER TABLE public.module_overrides
  ADD COLUMN IF NOT EXISTS look jsonb,
  ADD COLUMN IF NOT EXISTS collection text,
  ADD COLUMN IF NOT EXISTS hero_url text,
  ADD COLUMN IF NOT EXISTS blurb text;