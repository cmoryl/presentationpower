CREATE TABLE public.agent_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New presentation',
  deck_id uuid REFERENCES public.decks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_threads TO authenticated;
GRANT ALL ON public.agent_threads TO service_role;
ALTER TABLE public.agent_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own agent threads" ON public.agent_threads FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER agent_threads_updated_at BEFORE UPDATE ON public.agent_threads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.agent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.agent_threads(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_message_id text,
  role text NOT NULL,
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agent_messages_thread_idx ON public.agent_messages (thread_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_messages TO authenticated;
GRANT ALL ON public.agent_messages TO service_role;
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own agent messages" ON public.agent_messages FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);