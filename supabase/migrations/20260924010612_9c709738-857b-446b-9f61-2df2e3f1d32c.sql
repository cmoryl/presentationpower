INSERT INTO public.venues (slug,name,city,country,address,timezone,source_note) VALUES
('qeii-centre','Queen Elizabeth II Centre','London','United Kingdom','Broad Sanctuary, Westminster, London SW1P 3EE','Europe/London','Floors rebuilt from the issued Canva venue sheets for NEXT 2026 London (Job 2281).'),
('intercontinental-san-francisco','InterContinental San Francisco','San Francisco','United States','','America/Los_Angeles','Waiting on the hotel''s issued floor sheets. Web research findings stay suggestions until confirmed.')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.event_venues (event_id,venue_id) SELECT 'london',id FROM public.venues WHERE slug='qeii-centre' ON CONFLICT (event_id) DO NOTHING;
INSERT INTO public.event_venues (event_id,venue_id) SELECT 'san-francisco',id FROM public.venues WHERE slug='intercontinental-san-francisco' ON CONFLICT (event_id) DO NOTHING;