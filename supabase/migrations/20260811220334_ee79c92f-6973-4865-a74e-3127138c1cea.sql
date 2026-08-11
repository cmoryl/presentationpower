INSERT INTO public.module_variants (id, family_id, name, description, permitted_layout_ids, capacity, editable_fields, locked_fields)
VALUES (
  'MV-INFO-HUB-PILL-ORBIT',
  'MF-04',
  'Hub & pill orbit (4-12)',
  'Centre hub flanked by two stacks of pill chips whose edges trace the hub arc',
  ARRAY['LF-15'],
  '{"items":{"min":4,"max":12},"titleChars":46,"bodyChars":40}'::jsonb,
  ARRAY['title','subtitle','hub.title','hub.subtitle','items[].label','items[].icon','summary.lead','summary.emphasis'],
  ARRAY['footer','logo','connector']
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  permitted_layout_ids = EXCLUDED.permitted_layout_ids,
  capacity = EXCLUDED.capacity,
  editable_fields = EXCLUDED.editable_fields,
  locked_fields = EXCLUDED.locked_fields;