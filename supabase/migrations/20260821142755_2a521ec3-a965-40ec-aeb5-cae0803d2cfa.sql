INSERT INTO public.brand_modes (id, name, description, tokens)
VALUES ('bm-element', 'Element', 'TransPerfect Element product brand — the platform''s own marketing identity',
  '{"primary":"#135CFB","accent":"#08BFC1","surface":"#FFFFFF","ink":"#0D131D"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET tokens = EXCLUDED.tokens, name = EXCLUDED.name, description = EXCLUDED.description;

UPDATE public.decks
SET brand_mode_id = 'bm-element',
    context = jsonb_set(coalesce(context,'{}'::jsonb), '{stylePackId}', '"skin-s29"'),
    updated_at = now()
WHERE title ILIKE 'Element — Platform Overview%';