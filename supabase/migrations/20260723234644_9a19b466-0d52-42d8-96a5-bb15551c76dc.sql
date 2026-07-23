
-- Sync brand_modes token colors with canonical taxonomy in src/lib/taxonomy.ts.
-- Fixes: Legal (yellow → teal), Life Sci (pale → bright green), Gaming (lavender → emerald),
-- Digital (aqua → lavender), Division (lavender → sky-lavender), Trial Interactive, Product, Subcompany.
UPDATE public.brand_modes SET tokens = '{"primary":"#002673","accent":"#3BBEB6","surface":"#E4F4F2","ink":"#03002C"}'::jsonb WHERE id = 'bm-tp-legal';
UPDATE public.brand_modes SET tokens = '{"primary":"#003FC7","accent":"#58ED21","surface":"#EBFADE","ink":"#03002C"}'::jsonb WHERE id = 'bm-tp-lifesci';
UPDATE public.brand_modes SET tokens = '{"primary":"#0A1230","accent":"#4ADE80","surface":"#E6F7EE","ink":"#03002C"}'::jsonb WHERE id = 'bm-tp-games';
UPDATE public.brand_modes SET tokens = '{"primary":"#003FC7","accent":"#C2A3FF","surface":"#EFEAFB","ink":"#03002C"}'::jsonb WHERE id = 'bm-tp-digital';
UPDATE public.brand_modes SET tokens = '{"primary":"#130F4D","accent":"#7DA7FF","surface":"#EAEEFB","ink":"#03002C"}'::jsonb WHERE id = 'bm-division';
UPDATE public.brand_modes SET tokens = '{"primary":"#003FC7","accent":"#5CE1E6","surface":"#E1F6F7","ink":"#03002C"}'::jsonb WHERE id = 'bm-trial-interactive';
UPDATE public.brand_modes SET tokens = '{"primary":"#03002C","accent":"#5CE1E6","surface":"#E4F6F7","ink":"#03002C"}'::jsonb WHERE id = 'bm-product';
UPDATE public.brand_modes SET tokens = '{"primary":"#003FC7","accent":"#A1FBF9","surface":"#E0F2F4","ink":"#03002C"}'::jsonb WHERE id = 'bm-subcompany';
UPDATE public.brand_modes SET tokens = '{"primary":"#03002C","accent":"#EC388A","surface":"#FBE7EF","ink":"#03002C"}'::jsonb WHERE id = 'bm-tp-media';
UPDATE public.brand_modes SET tokens = '{"primary":"#03002C","accent":"#FF9B70","surface":"#FCEBE2","ink":"#03002C"}'::jsonb WHERE id = 'bm-cobrand';
UPDATE public.brand_modes SET tokens = '{"primary":"#03002C","accent":"#003FC7","surface":"#EEF1F7","ink":"#03002C"}'::jsonb WHERE id = 'bm-enterprise';
