CREATE TABLE public.learning_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('edit','approval','outcome')),
  subject_type text,
  subject_id text,
  division_id text,
  summary text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  distilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.learning_signals TO authenticated;
GRANT ALL ON public.learning_signals TO service_role;
ALTER TABLE public.learning_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users log their own signals" ON public.learning_signals FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users see own signals, admins all" ON public.learning_signals FOR SELECT TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update signals" ON public.learning_signals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.learning_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('rule','lesson','knowledge','template_idea')),
  title text NOT NULL,
  body text NOT NULL,
  division_id text,
  evidence_signal_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decision_note text,
  decided_by uuid,
  decided_at timestamptz,
  knowledge_entry_id uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.learning_suggestions TO authenticated;
GRANT ALL ON public.learning_suggestions TO service_role;
ALTER TABLE public.learning_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read suggestions" ON public.learning_suggestions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins create suggestions" ON public.learning_suggestions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND created_by = auth.uid());
CREATE POLICY "Admins decide suggestions" ON public.learning_suggestions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));