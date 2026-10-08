INSERT INTO public.event_booths (event, source_booth_id, boothhub_slug, name, has_tv, published_3d, sort_order, kind) VALUES
('next-sf','demo-booth-globallink-now','sign:demo-booth-globallink-now','NEXT demo booth — GlobalLink NOW',true,false,201,'sign'),
('next-sf','demo-booth-globallink-one','sign:demo-booth-globallink-one','NEXT demo booth — GlobalLink ONE',true,false,202,'sign'),
('next-sf','demo-booth-aura','sign:demo-booth-aura','NEXT demo booth — TransPerfect AURA',true,false,203,'sign'),
('next-sf','demo-booth-media','sign:demo-booth-media','NEXT demo booth — TransPerfect Media',true,false,204,'sign'),
('next-sf','demo-booth-globallink-web','sign:demo-booth-globallink-web','NEXT demo booth — GlobalLink Web',true,false,205,'sign')
ON CONFLICT (event, source_booth_id) DO NOTHING;