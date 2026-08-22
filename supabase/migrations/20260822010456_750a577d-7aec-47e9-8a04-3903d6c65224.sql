CREATE TABLE public.division_seeds (
  division_id text PRIMARY KEY,
  display_name text,
  accent text,
  deep text,
  logo_dark text,
  logo_white text,
  bright_field text,
  deep_field text,
  why_title text,
  why_eyebrow text,
  why_lines text[],
  why_cards jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.division_seeds TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.division_seeds TO authenticated;
GRANT ALL ON public.division_seeds TO service_role;

ALTER TABLE public.division_seeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "division_seeds_public_read" ON public.division_seeds
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "division_seeds_admin_write" ON public.division_seeds
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER division_seeds_touch BEFORE UPDATE ON public.division_seeds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();