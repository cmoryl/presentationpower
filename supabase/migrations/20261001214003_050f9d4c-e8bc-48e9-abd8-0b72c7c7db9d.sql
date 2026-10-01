UPDATE public.deck_slides
SET content = jsonb_set(content, '{items}', (
  SELECT jsonb_agg(e ORDER BY i) FROM jsonb_array_elements(content->'items') WITH ORDINALITY t(e,i)
  WHERE e->>'logoPath' NOT IN ('masters/general-slides/acq-25.svg','masters/general-slides/acq-27.svg')
))
WHERE deck_id = '7a6e1c52-0000-4e5a-9b1d-6e0a51ce0001' AND position = 4;