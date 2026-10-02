with d as (select '7a6e1c52-0000-4e5a-9b1d-6e0a51ce0001'::uuid id),
cfg(pos, region, bounds) as (values
  (9,  'AMER',  '{"latMin":15,"latMax":58,"lonMin":-162,"lonMax":-60}'::jsonb),
  (10, 'APAC',  '{"latMin":-42,"latMax":45,"lonMin":68,"lonMax":158}'::jsonb),
  (11, 'LATAM', '{"latMin":-40,"latMax":24,"lonMin":-105,"lonMax":-35}'::jsonb),
  (12, 'EMEA',  '{"latMin":-38,"latMax":66,"lonMin":-20,"lonMax":58}'::jsonb))
update public.deck_slides s
set variant_id = 'MV-LOC-REGION-FOCUS', layout_id = 'LF-06',
    content = s.content || jsonb_build_object('directory', true, 'region', cfg.region, 'bounds', cfg.bounds, 'kicker', s.content->>'badge')
from cfg, d
where s.deck_id = d.id and s.position = cfg.pos;

update public.deck_slides s
set variant_id = 'MV-LOC-WORLD-PINS', layout_id = 'LF-06',
    content = jsonb_build_object(
      'title', s.content->>'title',
      'kicker', s.content->>'kicker',
      'hideHeroStat', true,
      'items', (select jsonb_agg(i) from public.deck_slides o, jsonb_array_elements(o.content->'items') i
                where o.deck_id = s.deck_id and o.position between 9 and 12),
      'regionMetrics', (select jsonb_agg(jsonb_build_object('label', m->>'label', 'value', m->>'value'))
                        from jsonb_array_elements(s.content->'items') m))
where s.deck_id = '7a6e1c52-0000-4e5a-9b1d-6e0a51ce0001' and s.position = 13;

update public.deck_slides
set content = jsonb_set(content, '{__extras}', coalesce(content->'__extras', '{}'::jsonb) || '{"mode":"dark"}'::jsonb)
where deck_id = '7a6e1c52-0000-4e5a-9b1d-6e0a51ce0001';