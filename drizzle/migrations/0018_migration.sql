ALTER TABLE public.client_logos ADD COLUMN IF NOT EXISTS last_web_logo_url text, ADD COLUMN IF NOT EXISTS last_web_checked_at timestamptz;

CREATE TABLE public.logo_update_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_id uuid NOT NULL REFERENCES public.client_logos(id) ON DELETE CASCADE,
  website text NOT NULL,
  previous_logo_url text,
  found_logo_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.logo_update_checks TO authenticated;
GRANT ALL ON public.logo_update_checks TO service_role;
ALTER TABLE public.logo_update_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read logo checks" ON public.logo_update_checks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins decide logo checks" ON public.logo_update_checks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX logo_update_checks_status_idx ON public.logo_update_checks(status, created_at DESC);