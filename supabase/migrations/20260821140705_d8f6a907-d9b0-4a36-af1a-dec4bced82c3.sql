UPDATE public.decks
SET context = coalesce(context, '{}'::jsonb) || jsonb_build_object('stylePackId', 'skin-s29')
WHERE title = 'Element — Platform Overview (5 min)';