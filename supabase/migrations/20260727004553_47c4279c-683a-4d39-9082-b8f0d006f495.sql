DROP POLICY IF EXISTS "Authenticated can read knowledge entries" ON public.knowledge_entries;

CREATE POLICY "Read knowledge entries by visibility"
ON public.knowledge_entries
FOR SELECT
TO authenticated
USING (
  visibility <> 'private'::knowledge_visibility
  OR created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'brand_reviewer'::app_role)
);