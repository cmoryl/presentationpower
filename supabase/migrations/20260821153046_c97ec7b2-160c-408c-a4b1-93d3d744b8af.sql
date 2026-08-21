DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'decks','deck_slides','deck_versions','deck_translations','slide_translations',
    'briefs','print_assets','saved_modules','surfaces','surface_versions',
    'campaign_kits','agent_threads','agent_messages','print_page_templates','slide_modules'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admins manage all ' || t, t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''admin''::app_role))',
        'Admins manage all ' || t, t);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    END IF;
  END LOOP;
END $$;