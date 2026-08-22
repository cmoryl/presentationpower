ALTER TABLE public.agent_messages REPLICA IDENTITY FULL;
ALTER TABLE public.agent_threads REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_threads;