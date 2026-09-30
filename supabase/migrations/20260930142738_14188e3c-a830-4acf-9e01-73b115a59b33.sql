CREATE TABLE public.event_agendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  version integer NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  sessions jsonb NOT NULL DEFAULT '[]'::jsonb,
  days jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_url text,
  source_file text,
  note text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  published_by uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, version)
);
CREATE TABLE public.event_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  version integer NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  rooms jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_url text,
  source_file text,
  note text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  published_by uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_agendas TO authenticated;
GRANT ALL ON public.event_agendas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_rooms TO authenticated;
GRANT ALL ON public.event_rooms TO service_role;
ALTER TABLE public.event_agendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rooms ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_publish_event_assets(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'brand_lead')
$$;

CREATE POLICY "Signed-in read agendas" ON public.event_agendas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in add agenda drafts" ON public.event_agendas FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (status = 'draft' OR public.can_publish_event_assets(auth.uid())));
CREATE POLICY "Own drafts or publishers update agendas" ON public.event_agendas FOR UPDATE TO authenticated
  USING (status = 'draft' AND (created_by = auth.uid() OR public.can_publish_event_assets(auth.uid())))
  WITH CHECK (status = 'draft' OR public.can_publish_event_assets(auth.uid()));
CREATE POLICY "Own drafts deletable" ON public.event_agendas FOR DELETE TO authenticated
  USING (status = 'draft' AND (created_by = auth.uid() OR public.can_publish_event_assets(auth.uid())));

CREATE POLICY "Signed-in read rooms" ON public.event_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in add room drafts" ON public.event_rooms FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (status = 'draft' OR public.can_publish_event_assets(auth.uid())));
CREATE POLICY "Own drafts or publishers update rooms" ON public.event_rooms FOR UPDATE TO authenticated
  USING (status = 'draft' AND (created_by = auth.uid() OR public.can_publish_event_assets(auth.uid())))
  WITH CHECK (status = 'draft' OR public.can_publish_event_assets(auth.uid()));
CREATE POLICY "Own room drafts deletable" ON public.event_rooms FOR DELETE TO authenticated
  USING (status = 'draft' AND (created_by = auth.uid() OR public.can_publish_event_assets(auth.uid())));

CREATE OR REPLACE FUNCTION public.guard_event_asset_publish()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RAISE EXCEPTION 'A published version cannot be changed. Save a new version instead.';
  END IF;
  IF NEW.status = 'published' THEN
    IF auth.uid() IS NOT NULL AND NOT public.can_publish_event_assets(auth.uid()) THEN
      RAISE EXCEPTION 'Only admins and brand leads can publish.';
    END IF;
    NEW.published_by := coalesce(NEW.published_by, auth.uid());
    NEW.published_at := coalesce(NEW.published_at, now());
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER event_agendas_publish_guard BEFORE INSERT OR UPDATE ON public.event_agendas FOR EACH ROW EXECUTE FUNCTION public.guard_event_asset_publish();
CREATE TRIGGER event_rooms_publish_guard BEFORE INSERT OR UPDATE ON public.event_rooms FOR EACH ROW EXECUTE FUNCTION public.guard_event_asset_publish();