ALTER TABLE public.custom_modules
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewer_id uuid,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.custom_modules
  ADD CONSTRAINT custom_modules_review_status_check
  CHECK (review_status IN ('draft','pending','changes_requested','approved'));

UPDATE public.custom_modules SET review_status = 'approved', reviewed_at = updated_at WHERE status = 'published';

CREATE OR REPLACE FUNCTION public.guard_custom_module_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_reviewer boolean := public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'brand_reviewer');
BEGIN
  IF NEW.review_status IN ('approved','changes_requested')
     AND (TG_OP = 'INSERT' OR NEW.review_status IS DISTINCT FROM OLD.review_status)
     AND NOT is_reviewer THEN
    RAISE EXCEPTION 'Only admins and brand reviewers can decide a module review';
  END IF;
  IF NEW.status = 'published' AND NEW.review_status <> 'approved' THEN
    RAISE EXCEPTION 'A module must be approved before it is published';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER custom_modules_review_guard
BEFORE INSERT OR UPDATE ON public.custom_modules
FOR EACH ROW EXECUTE FUNCTION public.guard_custom_module_review();

CREATE POLICY "Reviewers read custom modules"
ON public.custom_modules FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'brand_reviewer'));

CREATE POLICY "Reviewers decide custom modules"
ON public.custom_modules FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'brand_reviewer'))
WITH CHECK (public.has_role(auth.uid(), 'brand_reviewer'));

CREATE OR REPLACE FUNCTION public.guard_approval_request_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'brand_reviewer') THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- service role / maintenance
  END IF;
  IF NEW.status <> 'pending'
     OR NEW.decided_by IS NOT NULL
     OR NEW.decided_at IS NOT NULL
     OR NEW.requested_by IS DISTINCT FROM OLD.requested_by
     OR NEW.subject_type IS DISTINCT FROM OLD.subject_type
     OR NEW.subject_id IS DISTINCT FROM OLD.subject_id THEN
    RAISE EXCEPTION 'Only a reviewer can decide an approval request';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER approval_requests_update_guard
BEFORE UPDATE ON public.approval_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_approval_request_update();