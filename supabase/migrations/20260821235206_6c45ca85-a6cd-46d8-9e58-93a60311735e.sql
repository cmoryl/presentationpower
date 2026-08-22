ALTER TABLE public.agent_threads
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'deck',
  ADD COLUMN IF NOT EXISTS print_asset_id uuid REFERENCES public.print_assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS agent_threads_kind_idx ON public.agent_threads (owner_id, kind, updated_at DESC);