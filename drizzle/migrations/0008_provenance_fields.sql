ALTER TABLE public.event_rooms ADD COLUMN IF NOT EXISTS source_page text, ADD COLUMN IF NOT EXISTS verified_by uuid, ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public.print_assets ADD COLUMN IF NOT EXISTS source_file text, ADD COLUMN IF NOT EXISTS source_page text, ADD COLUMN IF NOT EXISTS verified_by uuid, ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE OR REPLACE FUNCTION public.guard_provenance_verify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.verified_at IS DISTINCT FROM OLD.verified_at OR NEW.verified_by IS DISTINCT FROM OLD.verified_by) THEN
    IF auth.uid() IS NOT NULL AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'brand_lead')) THEN
      RAISE EXCEPTION 'Only a brand lead or admin can sign off provenance';
    END IF;
    IF NEW.verified_at IS NOT NULL THEN NEW.verified_by := auth.uid(); END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS event_rooms_provenance_guard ON public.event_rooms;
CREATE TRIGGER event_rooms_provenance_guard BEFORE UPDATE ON public.event_rooms FOR EACH ROW EXECUTE FUNCTION public.guard_provenance_verify();
DROP TRIGGER IF EXISTS print_assets_provenance_guard ON public.print_assets;
CREATE TRIGGER print_assets_provenance_guard BEFORE UPDATE ON public.print_assets FOR EACH ROW EXECUTE FUNCTION public.guard_provenance_verify();