CREATE TABLE public.approval_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  assignee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lane TEXT NOT NULL DEFAULT 'brand',
  decision TEXT NOT NULL DEFAULT 'pending',
  decision_note TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT approval_assignees_decision_chk CHECK (decision IN ('pending','approved','changes_requested')),
  CONSTRAINT approval_assignees_lane_chk CHECK (lane IN ('brand','marketing','compliance','admin')),
  UNIQUE (request_id, assignee_id)
);

CREATE INDEX approval_assignees_request_idx ON public.approval_assignees(request_id);
CREATE INDEX approval_assignees_assignee_idx ON public.approval_assignees(assignee_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_assignees TO authenticated;
GRANT ALL ON public.approval_assignees TO service_role;

ALTER TABLE public.approval_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignees readable by reviewers, assignees and requesters"
ON public.approval_assignees FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'brand_reviewer')
  OR assignee_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.approval_requests r
    WHERE r.id = request_id AND r.requested_by = auth.uid()
  )
);

CREATE POLICY "reviewers manage assignments"
ON public.approval_assignees FOR INSERT TO authenticated
WITH CHECK (
  assigned_by = auth.uid()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'brand_reviewer'))
);

CREATE POLICY "reviewers or the assignee can update"
ON public.approval_assignees FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'brand_reviewer')
  OR assignee_id = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'brand_reviewer')
  OR assignee_id = auth.uid()
);

CREATE POLICY "reviewers remove assignments"
ON public.approval_assignees FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'brand_reviewer'));

CREATE TRIGGER approval_assignees_updated_at
BEFORE UPDATE ON public.approval_assignees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();