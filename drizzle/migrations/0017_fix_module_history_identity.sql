CREATE OR REPLACE FUNCTION public.capture_module_catalogue_version() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE payload jsonb; previous jsonb; key text; next_revision integer;
BEGIN
 payload := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 key := CASE WHEN TG_TABLE_NAME = 'module_overrides' THEN (payload->>'scope') || ':' || (payload->>'module_id') ELSE payload->>'id' END;
 PERFORM pg_advisory_xact_lock(hashtextextended(TG_TABLE_NAME || ':' || key, 0));
 SELECT coalesce(max(revision),0)+1 INTO next_revision FROM public.module_catalogue_versions WHERE source_table=TG_TABLE_NAME AND source_key=key;
 IF next_revision=1 AND TG_OP<>'INSERT' THEN
   previous := to_jsonb(OLD);
   INSERT INTO public.module_catalogue_versions(source_table,source_key,revision,operation,snapshot,created_by) VALUES(TG_TABLE_NAME,key,1,'BASELINE',previous,auth.uid());
   next_revision := 2;
 END IF;
 INSERT INTO public.module_catalogue_versions(source_table,source_key,revision,operation,snapshot,created_by) VALUES(TG_TABLE_NAME,key,next_revision,TG_OP,payload,auth.uid());
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.capture_module_catalogue_version() FROM PUBLIC;