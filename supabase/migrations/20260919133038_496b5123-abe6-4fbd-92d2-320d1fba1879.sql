ALTER TABLE public.approval_requests
  ADD COLUMN IF NOT EXISTS change_reasons text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.approval_events
  ADD COLUMN IF NOT EXISTS change_reasons text[] NOT NULL DEFAULT '{}';