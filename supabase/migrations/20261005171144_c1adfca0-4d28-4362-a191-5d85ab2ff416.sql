UPDATE public.deck_slides d SET content = jsonb_set(d.content, '{items}', (
  SELECT jsonb_agg(i || jsonb_build_object('logoUrl', '/masters/general-slides/logos-color/' || regexp_replace(i->>'logoPath','^.*/','')) ORDER BY o)
  FROM jsonb_array_elements(d.content->'items') WITH ORDINALITY t(i,o)))
WHERE d.deck_id = '7a6e1c52-0000-4e5a-9b1d-6e0a51ce0002' AND d.position IN (3,4);

UPDATE public.deck_slides
SET content = replace(content::text, '/masters/general-slides/logos/', '/masters/general-slides/logos-ink/')::jsonb
WHERE deck_id = '7a6e1c52-0000-4e5a-9b1d-6e0a51ce0002' AND position = 20;