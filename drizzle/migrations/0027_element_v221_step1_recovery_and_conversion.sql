ALTER TABLE public.print_assets ADD COLUMN IF NOT EXISTS v221_conversion jsonb;
ALTER TABLE public.print_assets ADD COLUMN IF NOT EXISTS v221_original_content jsonb;
COMMENT ON COLUMN public.print_assets.v221_original_content IS 'Permanent immutable original content snapshot. Original content and editor routing remain unchanged in Step 1.';
COMMENT ON COLUMN public.print_assets.v221_conversion IS 'v221 module-stack conversion alongside original content; not read by workingLayout before reviewed cutover.';
CREATE OR REPLACE FUNCTION public.guard_v221_original_content() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF OLD.v221_original_content IS NOT NULL AND NEW.v221_original_content IS DISTINCT FROM OLD.v221_original_content THEN RAISE EXCEPTION 'Original Element content is a permanent recovery snapshot'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER print_assets_v221_original_guard BEFORE UPDATE ON public.print_assets FOR EACH ROW EXECUTE FUNCTION public.guard_v221_original_content();
REVOKE ALL ON FUNCTION public.guard_v221_original_content() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guard_v221_original_content() TO service_role;