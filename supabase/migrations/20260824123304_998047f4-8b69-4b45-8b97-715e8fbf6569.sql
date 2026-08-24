CREATE TABLE public.approval_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  title TEXT NOT NULL,
  subject_path TEXT,
  requested_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'normal',
  checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  decided_by UUID,
  decided_at TIMESTAMP WITH TIME ZONE,
  decision_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_requests TO authenticated;
GRANT ALL ON public.approval_requests TO service_role;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Submitters read own approval requests"
ON public.approval_requests FOR SELECT TO authenticated
USING (requested_by = auth.uid());

CREATE POLICY "Reviewers read all approval requests"
ON public.approval_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'brand_reviewer'));

CREATE POLICY "Users submit approval requests"
ON public.approval_requests FOR INSERT TO authenticated
WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Submitters update own pending requests"
ON public.approval_requests FOR UPDATE TO authenticated
USING (requested_by = auth.uid())
WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Reviewers decide approval requests"
ON public.approval_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'brand_reviewer'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'brand_reviewer'));

CREATE POLICY "Admins delete approval requests"
ON public.approval_requests FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX approval_requests_status_idx ON public.approval_requests (status, created_at DESC);
CREATE INDEX approval_requests_subject_idx ON public.approval_requests (subject_type, subject_id);

CREATE TRIGGER approval_requests_set_updated_at
BEFORE UPDATE ON public.approval_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.approval_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  body TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_comments TO authenticated;
GRANT ALL ON public.approval_comments TO service_role;
ALTER TABLE public.approval_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read comments on visible requests"
ON public.approval_comments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.approval_requests r
    WHERE r.id = request_id
      AND (
        r.requested_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'brand_reviewer')
      )
  )
);

CREATE POLICY "Comment on visible requests"
ON public.approval_comments FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.approval_requests r
    WHERE r.id = request_id
      AND (
        r.requested_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'brand_reviewer')
      )
  )
);

CREATE POLICY "Authors and reviewers update comments"
ON public.approval_comments FOR UPDATE TO authenticated
USING (
  author_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'brand_reviewer')
)
WITH CHECK (
  author_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'brand_reviewer')
);

CREATE POLICY "Authors and admins delete comments"
ON public.approval_comments FOR DELETE TO authenticated
USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX approval_comments_request_idx ON public.approval_comments (request_id, created_at);

CREATE TRIGGER approval_comments_set_updated_at
BEFORE UPDATE ON public.approval_comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();