CREATE OR REPLACE FUNCTION public.can_edit_venue(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','editor','content_owner','brand_lead','brand_reviewer')
  )
$$;

DROP POLICY IF EXISTS "Authenticated can insert venue plans" ON public.venue_plans;
DROP POLICY IF EXISTS "Authenticated can update venue plans" ON public.venue_plans;
DROP POLICY IF EXISTS "Authenticated can read venue plans" ON public.venue_plans;
DROP POLICY IF EXISTS "Creator or admin can delete venue plans" ON public.venue_plans;

CREATE POLICY "Authenticated can read venue plans"
ON public.venue_plans FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors can insert venue plans"
ON public.venue_plans FOR INSERT TO authenticated
WITH CHECK (public.can_edit_venue(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Editors can update venue plans"
ON public.venue_plans FOR UPDATE TO authenticated
USING (public.can_edit_venue(auth.uid()))
WITH CHECK (public.can_edit_venue(auth.uid()));

CREATE POLICY "Creator or admin can delete venue plans"
ON public.venue_plans FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated can insert venue pins" ON public.venue_pins;
DROP POLICY IF EXISTS "Authenticated can update venue pins" ON public.venue_pins;
DROP POLICY IF EXISTS "Authenticated can read venue pins" ON public.venue_pins;
DROP POLICY IF EXISTS "Creator or admin can delete venue pins" ON public.venue_pins;

CREATE POLICY "Authenticated can read venue pins"
ON public.venue_pins FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors can insert venue pins"
ON public.venue_pins FOR INSERT TO authenticated
WITH CHECK (public.can_edit_venue(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Editors can update venue pins"
ON public.venue_pins FOR UPDATE TO authenticated
USING (public.can_edit_venue(auth.uid()))
WITH CHECK (public.can_edit_venue(auth.uid()));

CREATE POLICY "Creator or admin can delete venue pins"
ON public.venue_pins FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));