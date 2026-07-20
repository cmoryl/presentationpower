ALTER TABLE public.imported_decks
  ADD COLUMN IF NOT EXISTS chunk_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS embedded_at timestamptz;