ALTER TABLE public.event_photos
  ADD COLUMN IF NOT EXISTS marketing_ok boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_by uuid,
  ADD COLUMN IF NOT EXISTS marketing_at timestamptz;

CREATE OR REPLACE FUNCTION public.guard_event_photo_marketing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.marketing_ok IS DISTINCT FROM COALESCE(OLD.marketing_ok, false) THEN
    IF NOT public.can_publish_event_assets(auth.uid()) THEN
      RAISE EXCEPTION 'Only admins or brand leads can clear event photos for marketing';
    END IF;
    NEW.marketing_by := CASE WHEN NEW.marketing_ok THEN auth.uid() ELSE NULL END;
    NEW.marketing_at := CASE WHEN NEW.marketing_ok THEN now() ELSE NULL END;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS event_photos_marketing_guard ON public.event_photos;
CREATE TRIGGER event_photos_marketing_guard BEFORE INSERT OR UPDATE ON public.event_photos
FOR EACH ROW EXECUTE FUNCTION public.guard_event_photo_marketing();

CREATE INDEX IF NOT EXISTS event_photos_marketing_idx ON public.event_photos (marketing_ok, event_id);