ALTER TABLE public.briefs ADD COLUMN sub_company text;
GRANT SELECT, INSERT, UPDATE ON public.briefs TO authenticated;
GRANT ALL ON public.briefs TO service_role;

COMMENT ON COLUMN public.briefs.sub_company IS 'Named TransPerfect sub-company when brand_mode_id is bm-subcompany';