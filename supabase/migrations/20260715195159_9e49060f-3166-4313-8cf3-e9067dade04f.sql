
INSERT INTO public.brand_modes (id, name, description, tokens) VALUES
  ('bm-tp-media', 'TransPerfect Media', 'Media localization: dubbing, subtitling, access services',
   '{"primary":"#141B34","accent":"#F04E45","surface":"#F5F1EA","ink":"#0A0F1C"}'::jsonb),
  ('bm-tp-legal', 'TransPerfect Legal', 'Legal solutions: eDiscovery, litigation, IP, legal translation',
   '{"primary":"#1B2A41","accent":"#B8862F","surface":"#F5F1EA","ink":"#0A0F1C"}'::jsonb),
  ('bm-tp-games', 'TransPerfect Gaming', 'Game localization, LQA, audio & community services',
   '{"primary":"#0E1626","accent":"#7C3AED","surface":"#F5F1EA","ink":"#0A0F1C"}'::jsonb),
  ('bm-tp-digital', 'TransPerfect Digital', 'Digital marketing, web localization & experience',
   '{"primary":"#0B2A4A","accent":"#22C1C3","surface":"#F5F1EA","ink":"#0A0F1C"}'::jsonb)
ON CONFLICT (id) DO NOTHING;
