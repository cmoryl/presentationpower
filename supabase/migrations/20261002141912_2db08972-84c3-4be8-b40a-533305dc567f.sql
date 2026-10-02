UPDATE public.deck_slides SET variant_id='MV-KPI-DASHBOARD', layout_id='LF-11',
 content = jsonb_build_object(
  'title', content->>'title',
  'subtitle', content->>'subtitle',
  '__extras', content->'__extras',
  'items', (content->'growth') || (content->'orbits'),
  'groups', jsonb_build_array(
     jsonb_build_object('label', content->>'growthLabel', 'items', content->'growth'),
     jsonb_build_object('label', (content->>'statsTitle')||' '||(content->>'statsEmphasis'), 'items', content->'orbits')))
WHERE deck_id='7a6e1c52-0000-4e5a-9b1d-6e0a51ce0001' AND position=2;