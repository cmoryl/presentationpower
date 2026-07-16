
-- ============================================================
-- Enterprise admin: analytics events, A/B testing, audit log
-- ============================================================

-- AI Gateway usage events (per-call)
CREATE TABLE public.ai_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  brand_id text,
  surface text,                 -- 'imagery' | 'brief' | 'deck' | 'knowledge' | 'other'
  model text NOT NULL,
  operation text NOT NULL,      -- 'chat' | 'image' | 'embedding' | 'tts' | 'stt'
  status text NOT NULL,         -- 'success' | 'error' | 'blocked'
  tokens_in integer DEFAULT 0,
  tokens_out integer DEFAULT 0,
  cost_credits numeric(12,4) DEFAULT 0,
  latency_ms integer DEFAULT 0,
  prompt_summary text,
  error_message text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_events_created_idx ON public.ai_events (created_at DESC);
CREATE INDEX ai_events_brand_idx   ON public.ai_events (brand_id, created_at DESC);
CREATE INDEX ai_events_user_idx    ON public.ai_events (user_id, created_at DESC);
CREATE INDEX ai_events_model_idx   ON public.ai_events (model, created_at DESC);
GRANT SELECT, INSERT ON public.ai_events TO authenticated;
GRANT ALL ON public.ai_events TO service_role;
ALTER TABLE public.ai_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read all ai_events" ON public.ai_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users log their own ai_events" ON public.ai_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Imagery library usage events
CREATE TABLE public.imagery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id text NOT NULL,
  user_id uuid,
  brand_id text,
  event_type text NOT NULL,     -- 'generate' | 'view' | 'use' | 'download' | 'delete'
  prompt text,
  memory_used boolean DEFAULT false,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX imagery_events_image_idx   ON public.imagery_events (image_id, created_at DESC);
CREATE INDEX imagery_events_brand_idx   ON public.imagery_events (brand_id, created_at DESC);
CREATE INDEX imagery_events_created_idx ON public.imagery_events (created_at DESC);
GRANT SELECT, INSERT ON public.imagery_events TO authenticated;
GRANT ALL ON public.imagery_events TO service_role;
ALTER TABLE public.imagery_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read all imagery_events" ON public.imagery_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users log their own imagery_events" ON public.imagery_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- A/B color experiments (deck palette variants)
CREATE TABLE public.ab_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  target text NOT NULL DEFAULT 'deck_palette',   -- future-proof: 'deck_palette' | 'marketing' etc.
  status text NOT NULL DEFAULT 'draft',          -- 'draft' | 'running' | 'paused' | 'ended'
  hypothesis text,
  primary_metric text DEFAULT 'cta_click',
  brand_id text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ab_experiments TO authenticated;
GRANT ALL ON public.ab_experiments TO service_role;
ALTER TABLE public.ab_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ab_experiments" ON public.ab_experiments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "All authed can read running experiments" ON public.ab_experiments
  FOR SELECT TO authenticated USING (status IN ('running','paused'));
CREATE TRIGGER ab_experiments_updated BEFORE UPDATE ON public.ab_experiments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ab_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.ab_experiments(id) ON DELETE CASCADE,
  name text NOT NULL,
  palette jsonb NOT NULL,       -- { primary, accent, ink, surface, ... }
  is_control boolean DEFAULT false,
  weight integer DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ab_variants_exp_idx ON public.ab_variants (experiment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ab_variants TO authenticated;
GRANT ALL ON public.ab_variants TO service_role;
ALTER TABLE public.ab_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ab_variants" ON public.ab_variants
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authed can read variants of readable experiments" ON public.ab_variants
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.ab_experiments e WHERE e.id = experiment_id AND e.status IN ('running','paused'))
  );

CREATE TABLE public.ab_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.ab_experiments(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.ab_variants(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (experiment_id, session_id)
);
CREATE INDEX ab_assignments_exp_idx ON public.ab_assignments (experiment_id, created_at DESC);
GRANT SELECT, INSERT ON public.ab_assignments TO authenticated;
GRANT ALL ON public.ab_assignments TO service_role;
ALTER TABLE public.ab_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read assignments" ON public.ab_assignments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authed insert assignments" ON public.ab_assignments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.ab_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.ab_experiments(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.ab_variants(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  user_id uuid,
  event_type text NOT NULL,     -- 'view' | 'dwell' | 'cta_click' | 'conversion'
  value numeric(12,4),
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ab_events_exp_idx ON public.ab_events (experiment_id, created_at DESC);
CREATE INDEX ab_events_variant_idx ON public.ab_events (variant_id, event_type);
GRANT SELECT, INSERT ON public.ab_events TO authenticated;
GRANT ALL ON public.ab_events TO service_role;
ALTER TABLE public.ab_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read ab_events" ON public.ab_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authed insert ab_events" ON public.ab_events
  FOR INSERT TO authenticated WITH CHECK (true);

-- Admin audit log (invites, role changes, publishes, kb approvals)
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  action text NOT NULL,
  target_type text,
  target_id text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_created_idx ON public.admin_audit_log (created_at DESC);
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert audit" ON public.admin_audit_log
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Extend app_role enum to include editor and viewer if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'app_role' AND e.enumlabel = 'editor') THEN
    ALTER TYPE public.app_role ADD VALUE 'editor';
  END IF;
END$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'app_role' AND e.enumlabel = 'viewer') THEN
    ALTER TYPE public.app_role ADD VALUE 'viewer';
  END IF;
END$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'app_role' AND e.enumlabel = 'brand_lead') THEN
    ALTER TYPE public.app_role ADD VALUE 'brand_lead';
  END IF;
END$$;
