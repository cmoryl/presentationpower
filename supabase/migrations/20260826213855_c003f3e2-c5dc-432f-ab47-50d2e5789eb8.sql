CREATE TABLE public.next_agenda_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_label TEXT NOT NULL DEFAULT '',
  division_id TEXT NOT NULL DEFAULT '',
  config JSONB NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.next_agenda_versions TO authenticated;
GRANT ALL ON public.next_agenda_versions TO service_role;

ALTER TABLE public.next_agenda_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agenda files"
  ON public.next_agenda_versions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agenda files"
  ON public.next_agenda_versions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agenda files"
  ON public.next_agenda_versions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agenda files"
  ON public.next_agenda_versions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_next_agenda_versions_updated_at
  BEFORE UPDATE ON public.next_agenda_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();