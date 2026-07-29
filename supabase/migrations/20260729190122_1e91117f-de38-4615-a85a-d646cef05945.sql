INSERT INTO public.brand_modes (id, name, description, tokens) VALUES
('bm-tp-finance','TransPerfect Finance','Financial services: banking, asset management, regulatory & investor content','{"primary":"#03002C","accent":"#FF9B70","surface":"#FCEBE2","ink":"#03002C"}'::jsonb),
('bm-tp-experience','TransPerfect Experience','Customer experience: contact centre, CX content, support & community','{"primary":"#03002C","accent":"#FF5757","surface":"#FDE8E8","ink":"#03002C"}'::jsonb),
('bm-tp-learn','TransPerfect Learn','Learning & development: eLearning localization, training and enablement','{"primary":"#003FC7","accent":"#FFEB66","surface":"#FEF9DC","ink":"#03002C"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, tokens=EXCLUDED.tokens;

UPDATE public.brand_modes SET tokens = '{"primary":"#0A1230","accent":"#A6FA87","surface":"#EDFBE5","ink":"#03002C"}'::jsonb WHERE id = 'bm-tp-games';
UPDATE public.brand_modes SET tokens = '{"primary":"#03002C","accent":"#E0A82E","surface":"#FBF1DC","ink":"#03002C"}'::jsonb WHERE id = 'bm-cobrand';