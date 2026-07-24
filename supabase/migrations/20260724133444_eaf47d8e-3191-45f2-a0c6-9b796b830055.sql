CREATE TABLE IF NOT EXISTS public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  event_type text NOT NULL,
  event_category text NOT NULL,
  division_id text,
  deck_id uuid,
  slide_id uuid,
  variant_id text,
  module_family text,
  surface text,
  duration_ms integer,
  value numeric(14,4),
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_events_created_idx ON public.usage_events (created_at DESC);
CREATE INDEX IF NOT EXISTS usage_events_user_idx ON public.usage_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS usage_events_type_idx ON public.usage_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS usage_events_category_idx ON public.usage_events (event_category, created_at DESC);
CREATE INDEX IF NOT EXISTS usage_events_division_idx ON public.usage_events (division_id, created_at DESC);
CREATE INDEX IF NOT EXISTS usage_events_variant_idx ON public.usage_events (variant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS usage_events_deck_idx ON public.usage_events (deck_id, created_at DESC);
CREATE INDEX IF NOT EXISTS usage_events_module_idx ON public.usage_events (module_family, created_at DESC);

GRANT INSERT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users log their own usage_events"
  ON public.usage_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Admins read all usage_events"
  ON public.usage_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));