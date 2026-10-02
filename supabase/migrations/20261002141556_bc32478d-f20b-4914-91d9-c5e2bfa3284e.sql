UPDATE public.deck_slides SET variant_id='MV-INFO-HUB-SATELLITES', layout_id='LF-15',
 content = jsonb_set(content #- '{items,4,highlight}', '{hub}', '{"title":"AI + Human"}'::jsonb)
WHERE deck_id='7a6e1c52-0000-4e5a-9b1d-6e0a51ce0001' AND position=21;