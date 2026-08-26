CREATE TABLE public.event_pillar_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_label TEXT NOT NULL DEFAULT '',
  scope TEXT NOT NULL DEFAULT 'events',
  config JSONB NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_pillar_versions TO authenticated;
GRANT ALL ON public.event_pillar_versions TO service_role;

ALTER TABLE public.event_pillar_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pillar files"
  ON public.event_pillar_versions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pillar files"
  ON public.event_pillar_versions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pillar files"
  ON public.event_pillar_versions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pillar files"
  ON public.event_pillar_versions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_event_pillar_versions_updated_at
  BEFORE UPDATE ON public.event_pillar_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();