DELETE FROM public.deck_slides WHERE deck_id='7a6e1c52-0000-4e5a-9b1d-6e0a51ce0001';
INSERT INTO public.deck_slides (deck_id,position,section_id,variant_id,layout_id,source_module_id,content,ai_change_log,notes)
SELECT '7a6e1c52-0000-4e5a-9b1d-6e0a51ce0001',position,section_id,variant_id,layout_id,source_module_id,content,ai_change_log,notes
FROM public.deck_slides WHERE deck_id='feab3402-440f-5a2d-aeab-3402440f7a2d';
UPDATE public.deck_slides SET content = content || '{"display":"loop"}'::jsonb WHERE deck_id='7a6e1c52-0000-4e5a-9b1d-6e0a51ce0001' AND content->>'title'='AI + Human-in-the-Loop';