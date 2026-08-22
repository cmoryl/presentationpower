ALTER TABLE public.agent_threads
  ADD COLUMN IF NOT EXISTS kit_id uuid REFERENCES public.campaign_kits(id) ON DELETE SET NULL;