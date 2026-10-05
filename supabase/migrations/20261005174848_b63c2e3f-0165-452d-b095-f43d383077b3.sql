UPDATE public.deck_slides
SET content = jsonb_set(content, '{__extras,mode}', '"dark"')
WHERE deck_id = '7a6e1c52-0000-4e5a-9b1d-6e0a51ce0001';

DELETE FROM public.deck_slides WHERE deck_id = 'feab3402-440f-5a2d-aeab-3402440f7a2d';
DELETE FROM public.deck_versions WHERE deck_id = 'feab3402-440f-5a2d-aeab-3402440f7a2d';
DELETE FROM public.decks WHERE id = 'feab3402-440f-5a2d-aeab-3402440f7a2d';