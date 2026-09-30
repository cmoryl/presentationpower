CREATE OR REPLACE FUNCTION public.can_edit_signs(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','brand_lead','brand_reviewer'))
$$;

CREATE TABLE public.sign_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  kind text NOT NULL CHECK (kind IN ('door','column','wall','room_sign','directional','header','kiosk','other')),
  layout_id text NOT NULL,
  source_label text,
  w_in numeric NOT NULL CHECK (w_in > 0),
  h_in numeric NOT NULL CHECK (h_in > 0),
  edits jsonb NOT NULL DEFAULT '{}'::jsonb,
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','rejected')),
  review_note text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sign_templates TO authenticated;
GRANT ALL ON public.sign_templates TO service_role;
ALTER TABLE public.sign_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read sign templates" ON public.sign_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sign editors add draft templates" ON public.sign_templates FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_signs(auth.uid()) AND created_by = auth.uid() AND status = 'draft');
CREATE POLICY "Creators or leads update templates" ON public.sign_templates FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_lead'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_lead'));
CREATE POLICY "Creators or admins delete templates" ON public.sign_templates FOR DELETE TO authenticated
  USING ((created_by = auth.uid() AND status <> 'approved') OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.sign_templates_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected') THEN
    IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'brand_lead')) THEN
      RAISE EXCEPTION 'Only admins and brand leads can approve sign templates';
    END IF;
    NEW.approved_by := auth.uid();
    NEW.approved_at := now();
  END IF;
  IF OLD.status = 'approved' AND NEW.status = 'approved'
     AND (NEW.edits IS DISTINCT FROM OLD.edits OR NEW.layout_id IS DISTINCT FROM OLD.layout_id OR NEW.fields IS DISTINCT FROM OLD.fields) THEN
    RAISE EXCEPTION 'Approved templates cannot be changed; save a new template instead';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER sign_templates_guard BEFORE UPDATE ON public.sign_templates FOR EACH ROW EXECUTE FUNCTION public.sign_templates_guard();

CREATE TABLE public.venue_sign_spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (length(label) BETWEEN 1 AND 120),
  kind text NOT NULL CHECK (kind IN ('door','column','wall','room_sign','directional','header','kiosk','other')),
  floor_key text,
  room text,
  w_in numeric CHECK (w_in IS NULL OR w_in > 0),
  h_in numeric CHECK (h_in IS NULL OR h_in > 0),
  sides integer NOT NULL DEFAULT 1 CHECK (sides BETWEEN 1 AND 4),
  photo_path text,
  note text,
  position integer NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_sign_spots TO authenticated;
GRANT ALL ON public.venue_sign_spots TO service_role;
ALTER TABLE public.venue_sign_spots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read sign spots" ON public.venue_sign_spots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Venue editors add sign spots" ON public.venue_sign_spots FOR INSERT TO authenticated WITH CHECK (public.can_edit_venue(auth.uid()));
CREATE POLICY "Venue editors change sign spots" ON public.venue_sign_spots FOR UPDATE TO authenticated USING (public.can_edit_venue(auth.uid())) WITH CHECK (public.can_edit_venue(auth.uid()));
CREATE POLICY "Venue editors remove sign spots" ON public.venue_sign_spots FOR DELETE TO authenticated USING (public.can_edit_venue(auth.uid()));
CREATE TRIGGER venue_sign_spots_updated_at BEFORE UPDATE ON public.venue_sign_spots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.event_sign_sets (
  event_id text PRIMARY KEY,
  choices jsonb NOT NULL DEFAULT '{}'::jsonb,
  copied_from text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_sign_sets TO authenticated;
GRANT ALL ON public.event_sign_sets TO service_role;
ALTER TABLE public.event_sign_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read sign sets" ON public.event_sign_sets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sign editors add sign sets" ON public.event_sign_sets FOR INSERT TO authenticated WITH CHECK (public.can_edit_signs(auth.uid()));
CREATE POLICY "Sign editors change sign sets" ON public.event_sign_sets FOR UPDATE TO authenticated USING (public.can_edit_signs(auth.uid())) WITH CHECK (public.can_edit_signs(auth.uid()));
CREATE POLICY "Sign editors remove sign sets" ON public.event_sign_sets FOR DELETE TO authenticated USING (public.can_edit_signs(auth.uid()));
CREATE TRIGGER event_sign_sets_updated_at BEFORE UPDATE ON public.event_sign_sets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.event_signs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  spot_id uuid NOT NULL REFERENCES public.venue_sign_spots(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.sign_templates(id) ON DELETE RESTRICT,
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'needs_text' CHECK (status IN ('ready','needs_text','needs_measuring','size_mismatch')),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, spot_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_signs TO authenticated;
GRANT ALL ON public.event_signs TO service_role;
ALTER TABLE public.event_signs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read event signs" ON public.event_signs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sign editors add event signs" ON public.event_signs FOR INSERT TO authenticated WITH CHECK (public.can_edit_signs(auth.uid()));
CREATE POLICY "Sign editors change event signs" ON public.event_signs FOR UPDATE TO authenticated USING (public.can_edit_signs(auth.uid())) WITH CHECK (public.can_edit_signs(auth.uid()));
CREATE POLICY "Sign editors remove event signs" ON public.event_signs FOR DELETE TO authenticated USING (public.can_edit_signs(auth.uid()));
CREATE TRIGGER event_signs_updated_at BEFORE UPDATE ON public.event_signs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Signed-in users read sign spot photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'venue-sign-photos');
CREATE POLICY "Venue editors upload sign spot photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'venue-sign-photos' AND public.can_edit_venue(auth.uid()));
CREATE POLICY "Venue editors remove sign spot photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'venue-sign-photos' AND public.can_edit_venue(auth.uid()));