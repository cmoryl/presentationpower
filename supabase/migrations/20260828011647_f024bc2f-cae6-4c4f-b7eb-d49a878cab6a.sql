ALTER TABLE public.template_background_overrides
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_poster_url text,
  ADD COLUMN IF NOT EXISTS video_variant text;

ALTER TABLE public.template_background_overrides
  DROP CONSTRAINT IF EXISTS template_background_overrides_video_variant_check;
ALTER TABLE public.template_background_overrides
  ADD CONSTRAINT template_background_overrides_video_variant_check
  CHECK (video_variant IS NULL OR video_variant IN ('cover','full-bleed','quote-motion'));