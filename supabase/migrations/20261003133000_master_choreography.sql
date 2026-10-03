UPDATE public.decks
SET context = COALESCE(context, '{}'::jsonb) || '{"choreography":"auto"}'::jsonb
WHERE id = '7a6e1c52-0000-4e5a-9b1d-6e0a51ce0001';
