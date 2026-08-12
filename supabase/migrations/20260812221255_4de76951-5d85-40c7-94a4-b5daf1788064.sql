INSERT INTO public.module_variants (id, family_id, name, description, permitted_layout_ids, capacity, editable_fields, locked_fields)
VALUES (
  'MV-PROC-STEP-SPOTLIGHT',
  'MF-04',
  'Numbered step spotlight',
  'Big step numeral over a circular photo, with an icon-led capability chain',
  ARRAY['LF-13'],
  '{"items":{"min":2,"max":5},"titleChars":44,"bodyChars":90}'::jsonb,
  ARRAY['title','subtitle','stepNumber','items[].label','items[].body','items[].icon'],
  ARRAY['footer','logo']
)
ON CONFLICT (id) DO UPDATE SET
  family_id = EXCLUDED.family_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  permitted_layout_ids = EXCLUDED.permitted_layout_ids,
  capacity = EXCLUDED.capacity,
  editable_fields = EXCLUDED.editable_fields,
  locked_fields = EXCLUDED.locked_fields;