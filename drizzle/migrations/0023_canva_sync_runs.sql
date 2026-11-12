CREATE TABLE public.canva_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  trigger text NOT NULL CHECK (trigger IN ('daily','manual')),
  checked integer NOT NULL DEFAULT 0,
  synced integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  remaining integer NOT NULL DEFAULT 0,
  stopped_reason text,
  problems jsonb NOT NULL DEFAULT '[]'::jsonb
);
GRANT SELECT ON public.canva_sync_runs TO authenticated;
GRANT ALL ON public.canva_sync_runs TO service_role;
ALTER TABLE public.canva_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read Canva sync runs" ON public.canva_sync_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.internal_job_tokens(name) VALUES ('canva_sync') ON CONFLICT DO NOTHING;