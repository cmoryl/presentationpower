GRANT SELECT ON public.social_asset_defaults TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_asset_defaults TO authenticated;
GRANT ALL ON public.social_asset_defaults TO service_role;