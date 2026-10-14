CREATE TABLE public.deck_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','done','failed')),
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  deck_id uuid,
  result text,
  error text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.deck_jobs TO authenticated;
GRANT ALL ON public.deck_jobs TO service_role;
ALTER TABLE public.deck_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own jobs: read" ON public.deck_jobs FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Own jobs: create" ON public.deck_jobs FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Own jobs: update" ON public.deck_jobs FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());