ALTER TABLE public.imported_decks
  ADD COLUMN IF NOT EXISTS templates jsonb NOT NULL DEFAULT '{"masters": [], "layouts": []}'::jsonb,
  ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.imported_decks.templates IS 'First-class slideMaster/slideLayout records recovered at import: name, type, placeholder geometry, background, decor layer names, usedBySlides. Stored outside slides so template views can load without slide bodies.';
COMMENT ON COLUMN public.imported_decks.sections IS 'Deck sections from p14:sectionLst: [{name, slideIndexes}].';