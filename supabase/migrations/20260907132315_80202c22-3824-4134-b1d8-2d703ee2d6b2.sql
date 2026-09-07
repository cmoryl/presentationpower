ALTER TABLE public.booth_templates
  ADD COLUMN IF NOT EXISTS shell_id TEXT NOT NULL DEFAULT 'tradebooth-a';

ALTER TABLE public.booth_templates
  DROP CONSTRAINT IF EXISTS booth_templates_shell_id_check;

ALTER TABLE public.booth_templates
  ADD CONSTRAINT booth_templates_shell_id_check
  CHECK (shell_id IN ('tradebooth-a', 'tradebooth-b'));

UPDATE public.booth_templates
  SET shell_id = 'tradebooth-b'
  WHERE slug ILIKE '%tradebooth-b';