import { defineTool } from "@lovable.dev/mcp-js";
import { textResult } from "../supabase";
import {
  BRAND_MODES,
  LAYOUT_FRAMEWORKS,
  MODULE_FAMILIES,
  MODULE_VARIANTS,
  NARRATIVE_ARCHETYPES,
  SECTION_FRAMEWORKS,
  variantsForSection,
} from "@/lib/taxonomy";
import { divisionLogoSlug } from "@/lib/division-logo-slugs";
import { backdropSetFor } from "@/lib/division-backdrop-manifest";

export default defineTool({
  name: "get_taxonomy",
  title: "Get taxonomy",
  description:
    "Discover the system's vocabulary: brand modes (divisions) with their colour tokens, logo slug and backdrop set, plus module families, section frameworks, layout frameworks and narrative archetypes. Ids, names and counts only — use list_variants for module bodies.",
  inputSchema: undefined,
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () =>
    textResult({
      brandModes: BRAND_MODES.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        role: b.role ?? null,
        tokens: {
          primary: b.tokens.primary,
          accent: b.tokens.accent,
          surface: b.tokens.surface,
          ink: b.tokens.ink,
        },
        logoSlug: divisionLogoSlug(b.id) ?? null,
        backdropSet: backdropSetFor(b.id),
      })),
      moduleFamilies: MODULE_FAMILIES.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        reviewLevel: f.reviewLevel,
        variantCount: MODULE_VARIANTS.filter((v) => v.familyId === f.id).length,
      })),

      sectionFrameworks: SECTION_FRAMEWORKS.map((s) => ({
        id: s.id,
        name: s.name,
        purpose: s.purpose,
        variantCount: variantsForSection(s.id).length,
      })),
      layoutFrameworks: LAYOUT_FRAMEWORKS.map((l) => ({
        id: l.id,
        name: l.name,
        description: l.description,
      })),
      narrativeArchetypes: NARRATIVE_ARCHETYPES.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        sectionRecipe: a.sectionRecipe,
      })),
      counts: {
        brandModes: BRAND_MODES.length,
        moduleFamilies: MODULE_FAMILIES.length,
        sectionFrameworks: SECTION_FRAMEWORKS.length,
        layoutFrameworks: LAYOUT_FRAMEWORKS.length,
        moduleVariants: MODULE_VARIANTS.length,
        narrativeArchetypes: NARRATIVE_ARCHETYPES.length,
      },
    }),
});
