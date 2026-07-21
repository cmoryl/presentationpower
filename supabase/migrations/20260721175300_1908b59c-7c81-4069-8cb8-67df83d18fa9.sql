
INSERT INTO public.module_variants (id, family_id, name, description, permitted_layout_ids, capacity, editable_fields, locked_fields) VALUES
('MV-PROOF-LOGOS-STRIP','MF-05','Client logo strip','Minimal single-row strip of six client / partner logos', ARRAY['LF-19'],
  '{"items":{"min":4,"max":6},"titleChars":60}'::jsonb,
  ARRAY['title','kicker','items[].name'], ARRAY['items[].logoUrl','footer','logo']),
('MV-PROOF-LOGOS-MARQUEE','MF-05','Client logo marquee','Two-row offset grid of up to ten client logos for scale', ARRAY['LF-19'],
  '{"items":{"min":8,"max":10},"titleChars":60}'::jsonb,
  ARRAY['title','subtitle','items[].name'], ARRAY['items[].logoUrl','footer','logo']),
('MV-PROOF-LOGOS-FEATURED','MF-05','Featured client + supporting wall','One hero client logo with four supporting proof logos', ARRAY['LF-12'],
  '{"items":{"min":5,"max":5},"titleChars":60,"bodyChars":220}'::jsonb,
  ARRAY['title','featuredName','featuredNote','items[].name'], ARRAY['featuredLogoUrl','items[].logoUrl','footer','logo']),
('MV-PROOF-LOGOS-CATEGORIZED','MF-05','Client logos by category','Two grouped columns of logos with a category label each', ARRAY['LF-04'],
  '{"items":{"min":2,"max":2},"titleChars":60,"bodyChars":60}'::jsonb,
  ARRAY['title','items[].label','items[].logos[].name'], ARRAY['items[].logos[].logoUrl','footer','logo']),
('MV-PROOF-LOGOS-MOSAIC','MF-05','Client logo mosaic','Bento-style asymmetric mosaic mixing wordmark tiles at different scales', ARRAY['LF-09'],
  '{"items":{"min":6,"max":8},"titleChars":60}'::jsonb,
  ARRAY['title','kicker','items[].name'], ARRAY['items[].logoUrl','footer','logo'])
ON CONFLICT (id) DO UPDATE SET
  family_id = EXCLUDED.family_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  permitted_layout_ids = EXCLUDED.permitted_layout_ids,
  capacity = EXCLUDED.capacity,
  editable_fields = EXCLUDED.editable_fields,
  locked_fields = EXCLUDED.locked_fields;
