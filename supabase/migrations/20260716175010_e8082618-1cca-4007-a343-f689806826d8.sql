
-- Admin write policies on oracle_knowledge_base
CREATE POLICY "Admins can insert oracle_knowledge_base"
  ON public.oracle_knowledge_base FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update oracle_knowledge_base"
  ON public.oracle_knowledge_base FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete oracle_knowledge_base"
  ON public.oracle_knowledge_base FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin write policies on brand_intelligence (read already allowed to authenticated)
CREATE POLICY "Admins can update brand_intelligence"
  ON public.brand_intelligence FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete brand_intelligence"
  ON public.brand_intelligence FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Unify: copy oracle_knowledge_base rows into knowledge_entries as global notes.
-- Idempotent via the source-tag marker `oracle:<uuid>` in the sources array.
INSERT INTO public.knowledge_entries
  (owner_division_id, title, body, kind, tags, sources, visibility, shared_with_division_ids)
SELECT
  'global',
  okb.title,
  okb.content,
  'note'::public.knowledge_kind,
  ARRAY['oracle-import', 'oracle:' || COALESCE(okb.content_type, 'text')]::text[]
    || COALESCE(okb.tags, ARRAY[]::text[]),
  ARRAY['oracle:' || okb.id::text]::text[],
  'global'::public.knowledge_visibility,
  ARRAY[]::text[]
FROM public.oracle_knowledge_base okb
WHERE okb.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.knowledge_entries ke
    WHERE ke.sources @> ARRAY['oracle:' || okb.id::text]
  );
