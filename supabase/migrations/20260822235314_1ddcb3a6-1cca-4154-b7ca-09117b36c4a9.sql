ALTER TABLE public.template_background_overrides
  ADD COLUMN IF NOT EXISTS image_priority text NOT NULL DEFAULT 'front';

ALTER TABLE public.template_background_overrides
  DROP CONSTRAINT IF EXISTS template_background_overrides_image_priority_check;

ALTER TABLE public.template_background_overrides
  ADD CONSTRAINT template_background_overrides_image_priority_check
  CHECK (image_priority IN ('front','behind'));