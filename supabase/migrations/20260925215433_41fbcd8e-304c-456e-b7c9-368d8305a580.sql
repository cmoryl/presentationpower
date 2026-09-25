CREATE TABLE public.kiosk_layer_edits (
  booth_id text PRIMARY KEY,
  edits jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kiosk_layer_edits TO authenticated;
GRANT ALL ON public.kiosk_layer_edits TO service_role;
ALTER TABLE public.kiosk_layer_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read kiosk edits" ON public.kiosk_layer_edits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors write kiosk edits" ON public.kiosk_layer_edits FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_lead') OR public.has_role(auth.uid(),'brand_reviewer'));
CREATE POLICY "Editors update kiosk edits" ON public.kiosk_layer_edits FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_lead') OR public.has_role(auth.uid(),'brand_reviewer'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_lead') OR public.has_role(auth.uid(),'brand_reviewer'));
CREATE POLICY "Editors delete kiosk edits" ON public.kiosk_layer_edits FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_lead'));
CREATE TRIGGER kiosk_layer_edits_updated_at BEFORE UPDATE ON public.kiosk_layer_edits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();