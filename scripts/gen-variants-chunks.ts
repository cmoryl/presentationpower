import { MODULE_VARIANTS } from "../src/lib/taxonomy";

const q = (s: string) => "'" + s.replace(/'/g, "''") + "'";

// chunk into groups of ~15
const chunkSize = 15;
for (let i = 0; i < MODULE_VARIANTS.length; i += chunkSize) {
  const chunk = MODULE_VARIANTS.slice(i, i + chunkSize).map((v) => ({
    id: v.id,
    family_id: v.familyId,
    name: v.name,
    description: v.description,
    permitted_layout_ids: v.permittedLayoutIds,
    capacity: v.capacity,
    fallback_variant_id: v.fallbackVariantId ?? "",
    editable_fields: v.editableFields,
    locked_fields: v.lockedFields,
  }));
  const json = JSON.stringify(chunk);
  console.log(`-- chunk ${i / chunkSize + 1}`);
  console.log(`INSERT INTO public.module_variants (id, family_id, name, description, permitted_layout_ids, capacity, fallback_variant_id, editable_fields, locked_fields)
SELECT r->>'id', r->>'family_id', r->>'name', r->>'description',
  ARRAY(SELECT jsonb_array_elements_text(r->'permitted_layout_ids')),
  r->'capacity',
  NULLIF(r->>'fallback_variant_id',''),
  ARRAY(SELECT jsonb_array_elements_text(r->'editable_fields')),
  ARRAY(SELECT jsonb_array_elements_text(r->'locked_fields'))
FROM jsonb_array_elements(${q(json)}::jsonb) r
ON CONFLICT (id) DO UPDATE SET family_id=EXCLUDED.family_id, name=EXCLUDED.name, description=EXCLUDED.description, permitted_layout_ids=EXCLUDED.permitted_layout_ids, capacity=EXCLUDED.capacity, fallback_variant_id=EXCLUDED.fallback_variant_id, editable_fields=EXCLUDED.editable_fields, locked_fields=EXCLUDED.locked_fields;
-- END CHUNK`);
}
