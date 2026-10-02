update public.decks
set context = (context - 'stylePackId' - 'darkStylePackId') || '{"skin":"enterprise-white"}'::jsonb
where id = '7a6e1c52-0000-4e5a-9b1d-6e0a51ce0001';