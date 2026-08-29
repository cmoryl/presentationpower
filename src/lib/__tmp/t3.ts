import { BRAND_PROFILES } from "@/lib/brand-profiles";
import { MODULE_VARIANTS, byId } from "@/lib/taxonomy";
const pref = BRAND_PROFILES["bm-enterprise"]!.contentScope.preferredVariantIds ?? [];
for (const id of ["MV-OP-AGENDA-VERTICAL","MV-STAT-PHOTO-BAND","MV-GOV-RACI"]) {
  const v = byId(MODULE_VARIANTS,id)!;
  const sameFam = pref.filter(p=>byId(MODULE_VARIANTS,p)?.familyId===v.familyId);
  console.log(id, v.familyId, "cap", JSON.stringify(v.capacity.items), "preferred in family:", sameFam.map(p=>`${p}:${JSON.stringify(byId(MODULE_VARIANTS,p)?.capacity.items)}`));
}
