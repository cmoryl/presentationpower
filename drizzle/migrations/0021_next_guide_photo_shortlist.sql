ALTER TABLE public.event_photos
  ADD COLUMN IF NOT EXISTS guide_status text CHECK (guide_status IN ('proposed','approved')),
  ADD COLUMN IF NOT EXISTS guide_status_by uuid,
  ADD COLUMN IF NOT EXISTS guide_status_at timestamptz;

CREATE OR REPLACE FUNCTION public.guard_event_photo_guide()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.guide_status IS DISTINCT FROM OLD.guide_status THEN
    IF NEW.guide_status = 'approved' OR OLD.guide_status = 'approved' THEN
      IF NOT public.can_publish_event_assets(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins or brand leads can approve guide photos';
      END IF;
    END IF;
    NEW.guide_status_by := auth.uid();
    NEW.guide_status_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_event_photo_guide ON public.event_photos;
CREATE TRIGGER guard_event_photo_guide BEFORE UPDATE ON public.event_photos
  FOR EACH ROW EXECUTE FUNCTION public.guard_event_photo_guide();

-- Public guide photos: only approved for the guide AND cleared for marketing.
CREATE OR REPLACE FUNCTION public.get_next_guide_photos()
RETURNS TABLE(id uuid, event_id text, path text, thumb_path text, sign_kind text, room text, width integer, height integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, event_id, path, thumb_path, sign_kind, room, width, height FROM public.event_photos
  WHERE guide_status = 'approved' AND marketing_ok = true AND event_id IN ('london-2026','san-francisco')
  ORDER BY sign_kind, id
$$;
GRANT EXECUTE ON FUNCTION public.get_next_guide_photos() TO anon, authenticated, service_role;

-- Proposed shortlist (picked by eye from the London contact sheets).
UPDATE public.event_photos SET guide_status = 'proposed' WHERE guide_status IS NULL AND id IN ('4763bcb7-8b6f-49f9-9898-ab16a8e7c9f5','b4d9de96-f8a1-4750-9be4-b11f2df807b4','5b316ce2-9b60-4bb1-b4bd-be315c86bd4d','9c94d06b-01cc-4f63-b3b5-29dafb5c7949','af54b293-75b4-48cf-90d7-dcece800fed2','963432bc-f254-45f8-9caa-98dd0d045f62','8a984c44-eb3d-49f3-b42b-914ceb658b8d','2b6dd1af-9b8f-44c9-a43b-96f24485d18e','6e5a58f8-582e-4f36-9cbe-52edc98ed40c','53535721-420e-4c51-9b44-51c5b6441820','9b23e74c-f8e7-499d-827c-39862ad9ba28','b2d10ff4-4fe4-478e-9458-e2603eb263ff','7a53f73e-38fe-47a6-935a-f696c99a7cfb','af11fe1e-4fcb-4336-9ee1-a2c36386fa2e','af39fba5-df1e-42b1-a55c-6504e46d1b3a','31bfd405-9053-49d3-9847-d89db40fbf78','87409d53-3dc8-40c0-a022-dc28e3675050','ab4c4907-2824-49de-bf19-cd1028bc01e5','119d6463-7657-4754-9101-6aebe05f7b3a','69b898e8-77ab-40ea-8a13-d37bd8a73a9a','f85e3417-06c9-4c58-ba58-4f33113e09aa','111d7909-2993-4042-b214-6710a5af2b80','d5087c8a-3dd2-462b-aa0e-8893b9187143','86135e1a-c47d-48a4-8c63-eb487c519926','617b6ed4-fd4c-4ccf-9c71-e10a58706fef','6ebd68d1-55e4-4739-8367-5b1823c02fe2','9d8d2593-a171-4794-8a4e-725fb25da6b9','e67720b3-7b67-4732-af53-1e0faae679bd','223b6973-b153-4ef5-a348-c89f185d276c','1be8b0bc-4567-4abd-a854-2c1d9fbfd616','21ddb572-b611-425e-9c65-5097f81f9d75','1b02e3fe-72d2-4082-8a45-be7c6e0b5b1d','f0bbca32-9a86-4508-ba58-6c1e6d9c1b70','f422ad8c-1127-4709-84a7-a7d2092cfdbc','3ac01f38-e8d9-43d8-80fa-2ebddba19f56','e530bfb2-4c27-4934-ae4d-5ddfddbbdef4','51691f1d-7c43-478c-8a88-0260d930040a','7c3eb0ff-a4b0-4140-b92d-544ffa555582','758292d3-399d-47d5-8cb2-6208ee521b50','4ba2121b-41d6-4c68-9e5b-9d4f71ab7c61','4ff4c605-6d77-4cbd-8877-ee84aee76f72','51327c91-9ab5-43ca-aed0-2e4cea005885','15c0c207-99f5-48da-add5-664f23a3a833');