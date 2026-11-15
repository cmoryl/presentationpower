CREATE TABLE public.element_v221_documents (path text PRIMARY KEY, data jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.element_v221_documents TO authenticated;
GRANT ALL ON public.element_v221_documents TO service_role;
ALTER TABLE public.element_v221_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY element_v221_staff_read ON public.element_v221_documents FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE FUNCTION public.element_v221_merge(t jsonb,p jsonb) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$ DECLARE k text; v jsonb; BEGIN IF jsonb_typeof(t) <> 'object' OR jsonb_typeof(p) <> 'object' THEN RETURN p; END IF; FOR k,v IN SELECT * FROM jsonb_each(p) LOOP IF jsonb_typeof(v)='object' AND jsonb_typeof(t->k)='object' THEN t=jsonb_set(t,ARRAY[k],public.element_v221_merge(t->k,v)); ELSE t=jsonb_set(t,ARRAY[k],v,true); END IF; END LOOP; RETURN t; END $$;
CREATE FUNCTION public.element_v221_store(op text, p text, body jsonb DEFAULT '{}'::jsonb, sort_field text DEFAULT NULL, sort_desc boolean DEFAULT false, max_rows integer DEFAULT 1000) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u text:=auth.uid()::text; a text[]; old jsonb; nxt jsonb; project jsonb; pid text; editor boolean; approver boolean; result jsonb;
BEGIN
IF u IS NULL OR NOT public.has_any_role(auth.uid()) THEN RAISE EXCEPTION 'permission_denied: staff sign-in required'; END IF;
IF p IS NULL OR length(p)>500 OR p ~ '(^/|/$|//)' THEN RAISE EXCEPTION 'invalid_argument: path'; END IF;
a=string_to_array(p,'/');
IF NOT (a[1] IN ('projects','signoffs','comments','photos','patterns','spectrum','learn','diag') OR p='meta/skill') THEN RAISE EXCEPTION 'invalid_argument: unsupported path'; END IF;
IF op='list' THEN
 IF cardinality(a)%2<>1 THEN RAISE EXCEPTION 'invalid_argument: collection'; END IF;
 SELECT coalesce(jsonb_agg(rowdoc),'[]'::jsonb) INTO result FROM (SELECT jsonb_build_object('id',split_part(path,'/',cardinality(a)+1),'data',data) rowdoc FROM public.element_v221_documents WHERE starts_with(path,p||'/') AND cardinality(string_to_array(path,'/'))=cardinality(a)+1 ORDER BY CASE WHEN NOT sort_desc THEN data->sort_field END ASC NULLS LAST, CASE WHEN sort_desc THEN data->sort_field END DESC NULLS LAST,path LIMIT greatest(1,least(max_rows,1000))) q;
 RETURN result;
END IF;
IF cardinality(a)%2<>0 THEN RAISE EXCEPTION 'invalid_argument: document'; END IF;
IF NOT ((a[1]='projects' AND (cardinality(a)=2 OR (a[3]='materials' AND cardinality(a)=4) OR (a[3]='materials' AND a[5]='versions' AND cardinality(a)=6))) OR (a[1]='signoffs' AND cardinality(a)=4 AND a[3]='items') OR (a[1] IN ('comments','photos','patterns','spectrum','learn','diag','meta') AND cardinality(a)=2)) THEN RAISE EXCEPTION 'invalid_argument: unsupported document path'; END IF;
IF op='get' THEN SELECT data INTO old FROM public.element_v221_documents WHERE path=p; RETURN jsonb_build_object('exists',FOUND,'data',old); END IF;
IF op NOT IN ('set','update','delete') THEN RAISE EXCEPTION 'invalid_argument: operation'; END IF;
editor=EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role::text IN ('admin','editor','content_owner','brand_lead','brand_reviewer'));
IF NOT editor AND NOT (a[1]='comments' AND a[2]=u) THEN RAISE EXCEPTION 'permission_denied: viewer write'; END IF;
IF op<>'delete' AND (body IS NULL OR jsonb_typeof(body)<>'object' OR octet_length(body::text)>2000000) THEN RAISE EXCEPTION 'invalid_argument: document body'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(p,0));
SELECT data INTO old FROM public.element_v221_documents WHERE path=p FOR UPDATE;
IF op='update' AND old IS NULL THEN RAISE EXCEPTION 'not_found: update requires an existing document'; END IF;
nxt=CASE WHEN op='update' THEN public.element_v221_merge(old,body) ELSE body END;
IF a[1]='projects' THEN
 pid=a[2]; SELECT data INTO project FROM public.element_v221_documents WHERE path='projects/'||pid;
 IF cardinality(a)=2 THEN
  IF old IS NULL THEN IF op='delete' OR nxt->>'ownerId' IS DISTINCT FROM u THEN RAISE EXCEPTION 'permission_denied: project owner must be caller'; END IF;
  ELSE
   IF op='delete' OR (nxt->'ownerId' IS DISTINCT FROM old->'ownerId') OR (nxt->'reviewers' IS DISTINCT FROM old->'reviewers') THEN IF old->>'ownerId' IS DISTINCT FROM u THEN RAISE EXCEPTION 'permission_denied: only owner controls project access'; END IF; END IF;
  END IF;
 ELSE
  IF project IS NULL THEN RAISE EXCEPTION 'not_found: parent project'; END IF;
  approver=project->>'ownerId'=u OR coalesce(project->'reviewers','[]'::jsonb) ? u;
  IF cardinality(a)=4 THEN
   IF op='delete' AND NOT (project->>'ownerId'=u OR (old->>'createdBy'=u AND coalesce(old->>'status','draft') NOT IN ('review','approved','delivered'))) THEN RAISE EXCEPTION 'permission_denied: material delete'; END IF;
   IF op<>'delete' AND NOT approver AND ((nxt->>'status' IN ('approved','delivered','changes') AND nxt->>'status' IS DISTINCT FROM old->>'status') OR (old->>'status' IN ('approved','delivered') AND nxt->>'status' IS DISTINCT FROM old->>'status')) THEN RAISE EXCEPTION 'permission_denied: reviewer decision required'; END IF;
  END IF;
 END IF;
ELSIF a[1]='signoffs' THEN
 IF a[2]<>u THEN RAISE EXCEPTION 'permission_denied: own signoff only'; END IF;
 IF op='delete' THEN nxt=old; END IF;
 SELECT data INTO project FROM public.element_v221_documents WHERE path='projects/'||(nxt->>'pid');
 IF project IS NULL OR NOT (project->>'ownerId'=u OR coalesce(project->'reviewers','[]'::jsonb) ? u) OR nxt->>'mid' IS DISTINCT FROM a[4] OR coalesce(nxt->>'hash','')='' THEN RAISE EXCEPTION 'permission_denied: project reviewer signoff required'; END IF;
ELSIF a[1]='comments' THEN IF a[2]<>u THEN RAISE EXCEPTION 'permission_denied: own comments only'; END IF;
ELSIF a[1]='meta' THEN RAISE EXCEPTION 'unavailable: skill publishing deferred';
END IF;
IF op='delete' THEN DELETE FROM public.element_v221_documents WHERE path=p; ELSE INSERT INTO public.element_v221_documents(path,data,updated_at) VALUES(p,nxt,now()) ON CONFLICT(path) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END IF;
RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.element_v221_store(text,text,jsonb,text,boolean,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.element_v221_store(text,text,jsonb,text,boolean,integer) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.element_v221_merge(jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.element_v221_merge(jsonb,jsonb) TO service_role;
ALTER PUBLICATION supabase_realtime ADD TABLE public.element_v221_documents;