CREATE TABLE public.approved_figures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  figure text NOT NULL,
  claim text NOT NULL,
  source_title text,
  source_url text,
  source_file text,
  division_id text,
  valid_until date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','retired')),
  approved_by uuid,
  approved_at timestamptz,
  note text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.approved_figures TO authenticated;
GRANT ALL ON public.approved_figures TO service_role;

ALTER TABLE public.approved_figures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users read approved figures" ON public.approved_figures
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Brand leads add approved figures" ON public.approved_figures
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_lead'));
CREATE POLICY "Brand leads edit approved figures" ON public.approved_figures
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_lead'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_lead'));

CREATE OR REPLACE FUNCTION public.guard_approved_figure()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_lead')) THEN
    RAISE EXCEPTION 'Only a brand lead or admin can change approved figures';
  END IF;
  NEW.updated_at := now();
  IF NEW.status = 'approved' THEN
    IF coalesce(btrim(NEW.source_title),'') = '' OR (coalesce(btrim(NEW.source_url),'') = '' AND coalesce(btrim(NEW.source_file),'') = '') THEN
      RAISE EXCEPTION 'A figure needs a source title and a source link or file before approval';
    END IF;
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved' THEN
      NEW.approved_by := auth.uid();
      NEW.approved_at := now();
    ELSE
      NEW.approved_by := OLD.approved_by;
      NEW.approved_at := OLD.approved_at;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.approved_by := OLD.approved_by;
    NEW.approved_at := OLD.approved_at;
  ELSE
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER approved_figures_guard BEFORE INSERT OR UPDATE ON public.approved_figures
  FOR EACH ROW EXECUTE FUNCTION public.guard_approved_figure();

INSERT INTO public.approved_figures (figure, claim, note) VALUES
  ('200+', '200+ languages', 'Found in print and slide templates (Languages supported)'),
  ('170+', '170+ languages', 'Found in brand intelligence copy'),
  ('150+', '150+ languages', 'Found in slide templates'),
  ('150+', '150+ cities', 'Found in print templates (Cities worldwide)'),
  ('140+', '140+ cities', 'Found in slide templates (Cities with local teams)'),
  ('140+', '140+ offices', 'Found in slide templates'),
  ('120+', '120+ locations', 'Found in templates'),
  ('10,000+', '10,000+ team members', 'Found in print templates (Team members)'),
  ('10,000+', '10,000+ employees', 'Found in slide templates (Employees worldwide)'),
  ('10,000+', '10,000+ linguists', 'Found in templates'),
  ('90%', '90% of the Fortune 500', 'Found in print templates (Of the Fortune 500)'),
  ('200+', '200+ language pairs', 'Found in templates'),
  ('30+', '30+ years of global delivery', 'Found in slide templates');