-- Light companion of the TransPerfect General Slides master: same 28 slides, every slide on the light ground.
INSERT INTO public.decks (id, owner_id, brief_id, archetype_id, brand_mode_id, title, status, context, is_template, review_status)
SELECT '7a6e1c52-0000-4e5a-9b1d-6e0a51ce0002', owner_id, brief_id, archetype_id, brand_mode_id,
       'TransPerfect General Slides — Master (Light)', status,
       (context - 'master') || jsonb_build_object('lightOf', id::text), true, review_status
FROM public.decks WHERE id = '7a6e1c52-0000-4e5a-9b1d-6e0a51ce0001'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.deck_slides (deck_id, position, section_id, variant_id, layout_id, source_module_id, content, ai_change_log, notes)
SELECT '7a6e1c52-0000-4e5a-9b1d-6e0a51ce0002', position, section_id, variant_id, layout_id, source_module_id,
       jsonb_set(content, '{__extras,mode}', '"light"', true), '[]'::jsonb, notes
FROM public.deck_slides
WHERE deck_id = '7a6e1c52-0000-4e5a-9b1d-6e0a51ce0001'
  AND NOT EXISTS (SELECT 1 FROM public.deck_slides WHERE deck_id = '7a6e1c52-0000-4e5a-9b1d-6e0a51ce0002');

UPDATE public.decks SET context = context || '{"master":"general-slides-light"}'::jsonb
WHERE id = '7a6e1c52-0000-4e5a-9b1d-6e0a51ce0002';