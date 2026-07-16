
DROP POLICY IF EXISTS "Authed insert assignments" ON public.ab_assignments;
CREATE POLICY "Authed insert assignments" ON public.ab_assignments
  FOR INSERT TO authenticated WITH CHECK (
    length(session_id) > 0
    AND (user_id IS NULL OR user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Authed insert ab_events" ON public.ab_events;
CREATE POLICY "Authed insert ab_events" ON public.ab_events
  FOR INSERT TO authenticated WITH CHECK (
    length(session_id) > 0
    AND (user_id IS NULL OR user_id = auth.uid())
  );
