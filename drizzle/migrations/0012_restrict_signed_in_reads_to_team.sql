DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public' AND cmd='SELECT' AND qual='true' AND roles = '{authenticated}'::name[]
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I USING (public.has_any_role(auth.uid()))', p.policyname, p.tablename);
  END LOOP;
END $$;