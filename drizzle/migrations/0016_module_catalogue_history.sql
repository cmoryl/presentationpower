CREATE TABLE public.module_catalogue_versions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 source_table text NOT NULL CHECK (source_table IN ('module_overrides','custom_modules','print_page_templates')),
 source_key text NOT NULL,
 revision integer NOT NULL,
 operation text NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE','BASELINE')),
 snapshot jsonb NOT NULL,
 created_by uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (source_table, source_key, revision)
);
GRANT SELECT ON public.module_catalogue_versions TO authenticated;
GRANT ALL ON public.module_catalogue_versions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.module_catalogue_versions_id_seq TO service_role;
ALTER TABLE public.module_catalogue_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read module history" ON public.module_catalogue_versions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX module_catalogue_versions_lookup ON public.module_catalogue_versions(source_table, source_key, revision DESC);
CREATE FUNCTION public.capture_module_catalogue_version() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE payload jsonb; previous jsonb; key text; next_revision integer;
BEGIN
 payload := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 key := CASE WHEN TG_TABLE_NAME = 'module_overrides' THEN payload->>'scope' || ':' || payload->>'module_id' ELSE payload->>'id' END;
 PERFORM pg_advisory_xact_lock(hashtextextended(TG_TABLE_NAME || ':' || key, 0));
 SELECT coalesce(max(revision),0)+1 INTO next_revision FROM public.module_catalogue_versions WHERE source_table=TG_TABLE_NAME AND source_key=key;
 IF next_revision=1 AND TG_OP<>'INSERT' THEN
   previous := to_jsonb(OLD);
   INSERT INTO public.module_catalogue_versions(source_table,source_key,revision,operation,snapshot,created_by) VALUES(TG_TABLE_NAME,key,1,'BASELINE',previous,auth.uid());
   next_revision := 2;
 END IF;
 INSERT INTO public.module_catalogue_versions(source_table,source_key,revision,operation,snapshot,created_by) VALUES(TG_TABLE_NAME,key,next_revision,TG_OP,payload,auth.uid());
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER module_override_history AFTER INSERT OR UPDATE OR DELETE ON public.module_overrides FOR EACH ROW EXECUTE FUNCTION public.capture_module_catalogue_version();
CREATE TRIGGER custom_module_history AFTER INSERT OR UPDATE OR DELETE ON public.custom_modules FOR EACH ROW EXECUTE FUNCTION public.capture_module_catalogue_version();
CREATE TRIGGER print_template_history AFTER INSERT OR UPDATE OR DELETE ON public.print_page_templates FOR EACH ROW EXECUTE FUNCTION public.capture_module_catalogue_version();
CREATE FUNCTION public.invalidate_changed_module_review() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF (to_jsonb(NEW) - ARRAY['status','review_status','review_notes','reviewer_id','reviewed_at','submitted_at','updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','review_status','review_notes','reviewer_id','reviewed_at','submitted_at','updated_at']) THEN
   NEW.status := 'draft'; NEW.review_status := 'draft'; NEW.reviewer_id := NULL; NEW.reviewed_at := NULL; NEW.submitted_at := NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_invalidate_changed_module_review BEFORE UPDATE ON public.custom_modules FOR EACH ROW EXECUTE FUNCTION public.invalidate_changed_module_review();
CREATE FUNCTION public.restore_module_catalogue_version(_id bigint, _expected_revision integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v public.module_catalogue_versions; latest integer; current_row jsonb; p jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only admins can restore module history'; END IF;
 SELECT * INTO v FROM public.module_catalogue_versions WHERE id=_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Version not found'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v.source_table || ':' || v.source_key,0));
 SELECT max(revision) INTO latest FROM public.module_catalogue_versions WHERE source_table=v.source_table AND source_key=v.source_key;
 IF latest<>_expected_revision THEN RAISE EXCEPTION 'This module changed. Refresh its history before restoring.'; END IF;
 p:=v.snapshot;
 IF v.source_table='module_overrides' THEN
   SELECT to_jsonb(t) INTO current_row FROM public.module_overrides t WHERE scope=p->>'scope' AND module_id=p->>'module_id' FOR UPDATE;
   IF current_row IS NULL THEN RAISE EXCEPTION 'This override was reset. Save a new override before restoring.'; END IF;
   UPDATE public.module_overrides SET label=p->>'label',description=p->>'description',tags=ARRAY(SELECT jsonb_array_elements_text(coalesce(p->'tags','[]'))),density=p->>'density',best_for=CASE WHEN jsonb_typeof(p->'best_for')='array' THEN ARRAY(SELECT jsonb_array_elements_text(p->'best_for')) ELSE NULL END,content=nullif(p->'content','null'::jsonb),notes=p->>'notes',blurb=p->>'blurb',collection=p->>'collection',hero_url=p->>'hero_url',look=nullif(p->'look','null'::jsonb),updated_by=auth.uid(),updated_at=now() WHERE scope=p->>'scope' AND module_id=p->>'module_id';
 ELSIF v.source_table='custom_modules' THEN
   PERFORM 1 FROM public.custom_modules WHERE id=(p->>'id')::uuid FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Module no longer exists'; END IF;
   UPDATE public.custom_modules SET name=p->>'name',description=p->>'description',base_variant_id=p->>'base_variant_id',family_id=p->>'family_id',section_id=p->>'section_id',brand_mode=p->>'brand_mode',tags=ARRAY(SELECT jsonb_array_elements_text(coalesce(p->'tags','[]'))),content=p->'content',canvas_blocks=p->'canvas_blocks',notes=p->>'notes',thumbnail_url=p->>'thumbnail_url',status='draft',review_status='draft',reviewer_id=NULL,reviewed_at=NULL,submitted_at=NULL,updated_at=now() WHERE id=(p->>'id')::uuid;
 ELSE
   PERFORM 1 FROM public.print_page_templates WHERE id=(p->>'id')::uuid FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Template no longer exists'; END IF;
   UPDATE public.print_page_templates SET title=p->>'title',description=p->>'description',kind=p->>'kind',division_id=p->>'division_id',tags=ARRAY(SELECT jsonb_array_elements_text(coalesce(p->'tags','[]'))),sections=p->'sections',layout=p->'layout',thumbnail_url=p->>'thumbnail_url',scope='private',hidden=false,updated_at=now() WHERE id=(p->>'id')::uuid;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.restore_module_catalogue_version(bigint,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_module_catalogue_version(bigint,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.capture_module_catalogue_version() FROM PUBLIC;
COMMENT ON TABLE public.module_catalogue_versions IS 'Append-only module and page-template history. System renderer releases remain code-versioned. Restored team modules require review; restored templates are private; visibility is not restored by metadata history.';