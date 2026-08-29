-- Sync brand_modes with the approved taxonomy: TransPerfect naming + enterprise palette
UPDATE public.brand_modes SET name = 'TransPerfect', description = 'TransPerfect master brand',
  tokens = '{"primary":"#03002C","accent":"#003FC7","surface":"#EEF1F7","ink":"#03002C"}'::jsonb
WHERE id = 'bm-enterprise';

UPDATE public.brand_modes SET tokens = '{"primary":"#03002C","accent":"#003FC7","surface":"#EEF1F7","ink":"#03002C"}'::jsonb
WHERE id IN ('bm-division','bm-subcompany','bm-tp-media','bm-tp-legal','bm-tp-games','bm-tp-digital','bm-tp-lifesci','bm-trial-interactive');

UPDATE public.brand_modes SET tokens = '{"primary":"#7BCD3A","accent":"#7BCD3A","surface":"#EEF1F7","ink":"#03002C"}'::jsonb
WHERE id = 'bm-product';

UPDATE public.brand_modes SET tokens = '{"primary":"#03002C","accent":"#FF9B70","surface":"#FCEBE2","ink":"#03002C"}'::jsonb
WHERE id = 'bm-cobrand';
