DELETE FROM public.brand_modes WHERE id IN ('bm-tp-finance','bm-tp-experience','bm-tp-learn');

UPDATE public.brand_modes
SET tokens = jsonb_build_object('primary','#0A1230','accent','#4ADE80','surface','#E6F7EE','ink','#03002C')
WHERE id = 'bm-tp-games';

UPDATE public.brand_modes
SET tokens = jsonb_build_object('primary','#03002C','accent','#FF9B70','surface','#FCEBE2','ink','#03002C')
WHERE id = 'bm-cobrand';