CREATE TABLE public.event_booths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  source_booth_id text NOT NULL,
  boothhub_slug text,
  name text NOT NULL,
  has_tv boolean NOT NULL DEFAULT true,
  published_3d boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event, source_booth_id),
  UNIQUE (event, boothhub_slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_booths TO authenticated;
GRANT ALL ON public.event_booths TO service_role;
ALTER TABLE public.event_booths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read booths" ON public.event_booths FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage booths" ON public.event_booths FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER event_booths_updated_at BEFORE UPDATE ON public.event_booths FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.booth_art (
  booth_id uuid NOT NULL REFERENCES public.event_booths(id) ON DELETE CASCADE,
  face text NOT NULL CHECK (face IN ('front','left','right')),
  path text NOT NULL,
  revision timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (booth_id, face)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booth_art TO authenticated;
GRANT ALL ON public.booth_art TO service_role;
ALTER TABLE public.booth_art ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read booth art" ON public.booth_art FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors write booth art" ON public.booth_art FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_lead') OR public.has_role(auth.uid(),'brand_reviewer'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_lead') OR public.has_role(auth.uid(),'brand_reviewer'));

CREATE TABLE public.booth_3d_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booth_id uuid NOT NULL REFERENCES public.event_booths(id) ON DELETE CASCADE,
  revision timestamptz NOT NULL,
  snapshot_path text,
  note text,
  checked_by uuid NOT NULL DEFAULT auth.uid(),
  checked_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.booth_3d_checks TO authenticated;
GRANT ALL ON public.booth_3d_checks TO service_role;
ALTER TABLE public.booth_3d_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read 3D checks" ON public.booth_3d_checks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors record 3D checks" ON public.booth_3d_checks FOR INSERT TO authenticated
  WITH CHECK (checked_by = auth.uid() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_lead') OR public.has_role(auth.uid(),'brand_reviewer')));

CREATE OR REPLACE FUNCTION public.get_event_booths(_event text)
RETURNS TABLE (boothhub_slug text, name text, has_tv boolean, published_3d boolean, sort_order int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT boothhub_slug, name, has_tv, published_3d, sort_order FROM public.event_booths
  WHERE event = _event AND boothhub_slug IS NOT NULL ORDER BY sort_order
$$;
GRANT EXECUTE ON FUNCTION public.get_event_booths(text) TO anon, authenticated;

CREATE POLICY "Signed-in read booth proofs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'booth-proofs');
CREATE POLICY "Editors write booth proofs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'booth-proofs' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_lead') OR public.has_role(auth.uid(),'brand_reviewer')));
CREATE POLICY "Editors update booth proofs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'booth-proofs' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_lead') OR public.has_role(auth.uid(),'brand_reviewer')));

INSERT INTO public.event_booths (event, source_booth_id, boothhub_slug, name, has_tv, sort_order) VALUES
('next-sf','global-digital-experience-tradebooth-a','globallink','GlobalLink Digital Experience',false,1),
('next-sf','veeva-tradebooth-a','veeva','Veeva Vault Certified Translations',true,2),
('next-sf','coa','coa-live-life-sci','COA — Where Science Meets Digital Health',false,3),
('next-sf','medical-writing','med-writing-life-sci','Medical Writing',false,4),
('next-sf','contact-center','connect-contact-center-life-sci','Connect Contact Center',true,5),
('next-sf','gl-live-tradebooth-a','gl-live-confrence','GlobalLink Live Conference',true,6),
('next-sf','live-customer-tradebooth-a','livecustomerconnectuni','Live Customer Connect',true,7),
('next-sf','global-content-delivery-tradebooth-a','global-content-delivery','Global Content Delivery',true,8),
('next-sf','media-tradebooth-a','media','Media Subtitling, Dubbing & Distribution',true,9),
('next-sf','learning-tradebooth-a','learning','Learning Solutions',true,10),
('next-sf','legal-support-2-tradebooth-b','legal-support','Legal Support',false,11),
('next-sf','sterling-2-tradebooth-a','stearling','Sterling Share — Dealmaking & File Sharing',true,12);