CREATE OR REPLACE FUNCTION public.is_event_team(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'admin') OR public.has_role(_user_id,'brand_lead')
      OR public.has_role(_user_id,'brand_reviewer') OR public.has_role(_user_id,'content_owner')
      OR public.has_role(_user_id,'editor')
$$;

CREATE OR REPLACE FUNCTION public.is_brand_reviewer(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'admin') OR public.has_role(_user_id,'brand_lead')
      OR public.has_role(_user_id,'brand_reviewer')
$$;

-- Vendor hand-offs: live supplied files sent outside the system
CREATE TABLE public.vendor_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(18), 'hex'),
  job_name text NOT NULL,
  vendor_name text NOT NULL,
  vendor_email text,
  contact text,
  deadline date,
  notes text,
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  pack_version text,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  revoked boolean NOT NULL DEFAULT false,
  download_count integer NOT NULL DEFAULT 0,
  last_downloaded_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.vendor_handoffs TO authenticated;
GRANT ALL ON public.vendor_handoffs TO service_role;
ALTER TABLE public.vendor_handoffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Event team reads hand-offs" ON public.vendor_handoffs FOR SELECT TO authenticated USING (public.is_event_team(auth.uid()));
CREATE POLICY "Event team creates hand-offs" ON public.vendor_handoffs FOR INSERT TO authenticated WITH CHECK (public.is_event_team(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Event team updates hand-offs" ON public.vendor_handoffs FOR UPDATE TO authenticated USING (public.is_event_team(auth.uid())) WITH CHECK (public.is_event_team(auth.uid()));

CREATE TABLE public.vendor_handoff_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_id uuid NOT NULL REFERENCES public.vendor_handoffs(id) ON DELETE CASCADE,
  file_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vendor_handoff_downloads TO authenticated;
GRANT ALL ON public.vendor_handoff_downloads TO service_role;
ALTER TABLE public.vendor_handoff_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Event team reads hand-off downloads" ON public.vendor_handoff_downloads FOR SELECT TO authenticated USING (public.is_event_team(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_vendor_handoff(_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _token IS NULL OR length(_token) < 16 THEN jsonb_build_object('status','invalid')
    ELSE COALESCE((
      SELECT CASE WHEN h.revoked THEN jsonb_build_object('status','revoked')
                  WHEN h.expires_at < now() THEN jsonb_build_object('status','expired')
                  ELSE jsonb_build_object('status','valid','job_name',h.job_name,'vendor_name',h.vendor_name,
                    'contact',h.contact,'deadline',h.deadline,'notes',h.notes,'files',h.files,
                    'pack_version',h.pack_version,'expires_at',h.expires_at,'created_at',h.created_at) END
      FROM public.vendor_handoffs h WHERE h.token = _token
    ), jsonb_build_object('status','invalid'))
  END
$$;

CREATE OR REPLACE FUNCTION public.record_vendor_download(_token text, _label text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN RETURN; END IF;
  SELECT id INTO _id FROM public.vendor_handoffs WHERE token = _token AND NOT revoked AND expires_at > now();
  IF _id IS NULL THEN RETURN; END IF;
  INSERT INTO public.vendor_handoff_downloads(handoff_id, file_label) VALUES (_id, left(coalesce(_label,''), 200));
  UPDATE public.vendor_handoffs SET download_count = download_count + 1, last_downloaded_at = now() WHERE id = _id;
END $$;
GRANT EXECUTE ON FUNCTION public.get_vendor_handoff(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_vendor_download(text, text) TO anon, authenticated;

-- Partner hand-back: outside designers upload finished work for review
CREATE OR REPLACE FUNCTION public.is_valid_kit_share(_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _token IS NOT NULL AND length(_token) >= 16 AND EXISTS (
    SELECT 1 FROM public.next_brand_kit_shares s WHERE s.token = _token AND NOT s.revoked AND s.expires_at > now())
$$;
GRANT EXECUTE ON FUNCTION public.is_valid_kit_share(text) TO anon, authenticated;

CREATE TABLE public.partner_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid,
  designer_name text NOT NULL,
  designer_email text,
  title text NOT NULL,
  note text,
  pack_version text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.partner_submissions TO authenticated;
GRANT ALL ON public.partner_submissions TO service_role;
ALTER TABLE public.partner_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Event team reads partner submissions" ON public.partner_submissions FOR SELECT TO authenticated USING (public.is_event_team(auth.uid()));
CREATE POLICY "Reviewers decide partner submissions" ON public.partner_submissions FOR UPDATE TO authenticated USING (public.is_brand_reviewer(auth.uid())) WITH CHECK (public.is_brand_reviewer(auth.uid()));

CREATE OR REPLACE FUNCTION public.guard_partner_submission_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.is_brand_reviewer(auth.uid()) THEN RAISE EXCEPTION 'Only brand reviewers can decide submissions'; END IF;
    IF NEW.status NOT IN ('pending','approved','changes') THEN RAISE EXCEPTION 'Unknown status'; END IF;
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  END IF;
  NEW.file_path := OLD.file_path; NEW.designer_name := OLD.designer_name; NEW.share_id := OLD.share_id;
  RETURN NEW;
END $$;
CREATE TRIGGER partner_submission_review_guard BEFORE UPDATE ON public.partner_submissions
  FOR EACH ROW EXECUTE FUNCTION public.guard_partner_submission_review();

CREATE OR REPLACE FUNCTION public.submit_partner_design(_token text, _designer_name text, _designer_email text, _title text, _note text, _pack_version text, _file_path text, _file_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _share uuid; _id uuid;
BEGIN
  IF NOT public.is_valid_kit_share(_token) THEN RAISE EXCEPTION 'This link is not valid'; END IF;
  IF coalesce(trim(_designer_name),'') = '' OR coalesce(trim(_title),'') = '' THEN RAISE EXCEPTION 'Name and title are required'; END IF;
  IF _file_path IS NULL OR split_part(_file_path,'/',1) <> _token THEN RAISE EXCEPTION 'File not uploaded with this link'; END IF;
  SELECT id INTO _share FROM public.next_brand_kit_shares WHERE token = _token;
  INSERT INTO public.partner_submissions(share_id, designer_name, designer_email, title, note, pack_version, file_path, file_name)
  VALUES (_share, left(_designer_name,120), left(_designer_email,200), left(_title,200), left(_note,2000), left(_pack_version,20), _file_path, left(_file_name,200))
  RETURNING id INTO _id;
  RETURN _id;
END $$;
GRANT EXECUTE ON FUNCTION public.submit_partner_design(text,text,text,text,text,text,text,text) TO anon, authenticated;