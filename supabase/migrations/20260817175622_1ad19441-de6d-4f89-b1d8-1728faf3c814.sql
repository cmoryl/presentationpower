CREATE TABLE public.style_reco_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  signal TEXT NOT NULL,
  style_code TEXT,
  recommended_codes TEXT[] NOT NULL DEFAULT '{}',
  rank_shown INTEGER,
  profile_key TEXT NOT NULL DEFAULT '',
  brief JSONB NOT NULL DEFAULT '{}'::jsonb,
  deck_id UUID,
  polarity NUMERIC NOT NULL DEFAULT 0,
  learnable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX style_reco_events_user_idx ON public.style_reco_events (user_id, created_at DESC);
CREATE INDEX style_reco_events_profile_idx ON public.style_reco_events (profile_key, created_at DESC);

GRANT SELECT, INSERT ON public.style_reco_events TO authenticated;
GRANT ALL ON public.style_reco_events TO service_role;
ALTER TABLE public.style_reco_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own style signals readable" ON public.style_reco_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own style signals insertable" ON public.style_reco_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE TABLE public.style_learning_prefs (
  user_id UUID NOT NULL PRIMARY KEY DEFAULT auth.uid(),
  learning_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ignore_before TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.style_learning_prefs TO authenticated;
GRANT ALL ON public.style_learning_prefs TO service_role;
ALTER TABLE public.style_learning_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own learning prefs" ON public.style_learning_prefs
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER style_learning_prefs_updated_at
  BEFORE UPDATE ON public.style_learning_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.style_expansion_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  recipe_id TEXT,
  objective TEXT,
  audience TEXT,
  style_codes TEXT[] NOT NULL DEFAULT '{}',
  observations INTEGER NOT NULL DEFAULT 0,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  review_note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.style_expansion_candidates TO authenticated;
GRANT ALL ON public.style_expansion_candidates TO service_role;
ALTER TABLE public.style_expansion_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read expansion candidates" ON public.style_expansion_candidates
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "signed in can raise candidates" ON public.style_expansion_candidates
  FOR INSERT TO authenticated
  WITH CHECK (status = 'pending');
CREATE POLICY "admins update expansion candidates" ON public.style_expansion_candidates
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER style_expansion_candidates_updated_at
  BEFORE UPDATE ON public.style_expansion_candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();