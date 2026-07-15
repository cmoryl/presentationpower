import {
  BRAND_MODES,
  SECTION_FRAMEWORKS,
  MODULE_FAMILIES,
  LAYOUT_FRAMEWORKS,
  MODULE_VARIANTS,
  NARRATIVE_ARCHETYPES,
} from "../src/lib/taxonomy";

const q = (s: string) => "'" + s.replace(/'/g, "''") + "'";
const jArr = (rows: unknown[]) => q(JSON.stringify(rows)) + "::jsonb";

const parts: string[] = [];

parts.push(`INSERT INTO public.brand_modes (id, name, description, tokens)
SELECT r->>'id', r->>'name', r->>'description', r->'tokens'
FROM jsonb_array_elements(${jArr(
  BRAND_MODES.map((b) => ({ id: b.id, name: b.name, description: b.description, tokens: b.tokens })),
)}) r
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, tokens=EXCLUDED.tokens;`);

parts.push(`INSERT INTO public.module_families (id, name, description, review_level)
SELECT r->>'id', r->>'name', r->>'description', r->>'review_level'
FROM jsonb_array_elements(${jArr(
  MODULE_FAMILIES.map((f) => ({ id: f.id, name: f.name, description: f.description, review_level: f.reviewLevel })),
)}) r
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, review_level=EXCLUDED.review_level;`);

parts.push(`INSERT INTO public.section_frameworks (id, name, purpose, permitted_family_ids)
SELECT r->>'id', r->>'name', r->>'purpose',
  ARRAY(SELECT jsonb_array_elements_text(r->'permitted_family_ids'))
FROM jsonb_array_elements(${jArr(
  SECTION_FRAMEWORKS.map((s) => ({ id: s.id, name: s.name, purpose: s.purpose, permitted_family_ids: s.permittedFamilyIds })),
)}) r
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, purpose=EXCLUDED.purpose, permitted_family_ids=EXCLUDED.permitted_family_ids;`);

parts.push(`INSERT INTO public.layout_frameworks (id, name, description, zones)
SELECT r->>'id', r->>'name', r->>'description',
  ARRAY(SELECT jsonb_array_elements_text(r->'zones'))
FROM jsonb_array_elements(${jArr(
  LAYOUT_FRAMEWORKS.map((l) => ({ id: l.id, name: l.name, description: l.description, zones: l.zones })),
)}) r
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, zones=EXCLUDED.zones;`);

parts.push(`INSERT INTO public.module_variants (id, family_id, name, description, permitted_layout_ids, capacity, fallback_variant_id, editable_fields, locked_fields)
SELECT r->>'id', r->>'family_id', r->>'name', r->>'description',
  ARRAY(SELECT jsonb_array_elements_text(r->'permitted_layout_ids')),
  r->'capacity',
  NULLIF(r->>'fallback_variant_id',''),
  ARRAY(SELECT jsonb_array_elements_text(r->'editable_fields')),
  ARRAY(SELECT jsonb_array_elements_text(r->'locked_fields'))
FROM jsonb_array_elements(${jArr(
  MODULE_VARIANTS.map((v) => ({
    id: v.id,
    family_id: v.familyId,
    name: v.name,
    description: v.description,
    permitted_layout_ids: v.permittedLayoutIds,
    capacity: v.capacity,
    fallback_variant_id: v.fallbackVariantId ?? "",
    editable_fields: v.editableFields,
    locked_fields: v.lockedFields,
  })),
)}) r
ON CONFLICT (id) DO UPDATE SET family_id=EXCLUDED.family_id, name=EXCLUDED.name, description=EXCLUDED.description, permitted_layout_ids=EXCLUDED.permitted_layout_ids, capacity=EXCLUDED.capacity, fallback_variant_id=EXCLUDED.fallback_variant_id, editable_fields=EXCLUDED.editable_fields, locked_fields=EXCLUDED.locked_fields;`);

parts.push(`INSERT INTO public.narrative_archetypes (id, name, description, section_recipe)
SELECT r->>'id', r->>'name', r->>'description',
  ARRAY(SELECT jsonb_array_elements_text(r->'section_recipe'))
FROM jsonb_array_elements(${jArr(
  NARRATIVE_ARCHETYPES.map((a) => ({ id: a.id, name: a.name, description: a.description, section_recipe: a.sectionRecipe })),
)}) r
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, section_recipe=EXCLUDED.section_recipe;`);

console.log(parts.join("\n\n"));
