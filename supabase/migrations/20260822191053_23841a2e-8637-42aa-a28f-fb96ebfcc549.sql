CREATE TABLE public.demo_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_kind text NOT NULL,
  demo_id text NOT NULL,
  division_key text NOT NULL DEFAULT '',
  payload jsonb NOT NULL,
  label text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (demo_kind, demo_id, division_key)
);

GRANT SELECT ON public.demo_overrides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_overrides TO authenticated;
GRANT ALL ON public.demo_overrides TO service_role;

ALTER TABLE public.demo_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read live demo overrides"
  ON public.demo_overrides FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins manage live demo overrides"
  ON public.demo_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER demo_overrides_set_updated_at
  BEFORE UPDATE ON public.demo_overrides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();