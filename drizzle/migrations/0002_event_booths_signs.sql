ALTER TABLE public.event_booths ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'kiosk' CHECK (kind IN ('kiosk','sign'));
INSERT INTO public.event_booths (event, source_booth_id, boothhub_slug, name, has_tv, published_3d, sort_order, kind) VALUES
 ('next-sf','demo-booth','sign:demo-booth','NEXT demo booth',true,false,200,'sign'),
 ('next-sf','sf-surround-all','sign:surround-all','Breakout screen surround — all sides',true,true,210,'sign'),
 ('next-sf','sf-surround-three','sign:surround-three','Breakout screen surround — three sides',true,true,211,'sign'),
 ('next-sf','finance-pillar-welcome','sign:welcome','FinanceNEXT Welcome pillar',false,true,220,'sign'),
 ('next-sf','finance-pillar-profile','sign:finance','FinanceNEXT Profile pillar',false,true,221,'sign')
ON CONFLICT (event, source_booth_id) DO NOTHING;