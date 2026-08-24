CREATE TABLE public.approval_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  actor_id uuid,
  kind text NOT NULL,
  from_status text,
  to_status text,
  note text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX approval_events_request_idx ON public.approval_events (request_id, created_at);

GRANT SELECT, INSERT ON public.approval_events TO authenticated;
GRANT ALL ON public.approval_events TO service_role;

ALTER TABLE public.approval_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read events on visible requests"
ON public.approval_events FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.approval_requests r
  WHERE r.id = approval_events.request_id
    AND (r.requested_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'brand_reviewer'::app_role))
));

CREATE POLICY "Log events on visible requests"
ON public.approval_events FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.approval_requests r
    WHERE r.id = approval_events.request_id
      AND (r.requested_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'brand_reviewer'::app_role))
  )
);