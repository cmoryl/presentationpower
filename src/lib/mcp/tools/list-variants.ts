import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { textResult } from "../supabase";
import {
  MODULE_FAMILIES,
  MODULE_VARIANTS,
  SECTION_FRAMEWORKS,
  byId,
  variantsForSection,
  type ModuleVariant,
} from "@/lib/taxonomy";
import { BRAND_PROFILES } from "@/lib/brand-profiles";
import { hasNativeVariantEmitter } from "@/lib/export-native-variants";
import { resolveCapacity } from "@/lib/taxonomy-capacity";

/** One-line authoring guidance, derived from the variant's own contract. */
function useThisWhen(v: ModuleVariant): string {
  const family = byId(MODULE_FAMILIES, v.familyId);
  const items = v.capacity.items;
  const shape = items
    ? `${items.min}–${items.max} items`
    : v.capacity.bodyChars
      ? `up to ~${v.capacity.bodyChars} chars of body copy`
      : "a single focused statement";
  return `Use for ${family?.name.toLowerCase() ?? "general"} content carrying ${shape}. ${v.description}`;
}

export default defineTool({
  name: "list_variants",
  title: "List module variants",
  description:
    "Filtered catalogue of every module variant. Filter by family, section, brand mode (respects that division's restricted families and preferred modules) or a free-text query. Returns each variant's id, family, name, layout hint, whether the PPTX exporter has a dedicated renderer for it, and a one-line 'use this when'.",
  inputSchema: {
    family: z.string().describe("Module family id (e.g. 'MF-03') or a family name fragment.")
      .optional(),
    section_id: z.string().describe("Restrict to variants permitted for a section, e.g. 'SF-06'.")
      .optional(),
    brand_mode_id: z
      .string()
      .describe("Restrict to what this division is allowed to use, e.g. 'bm-tp-legal'.")
      .optional(),
    query: z.string().describe("Free-text match against id, name and description.").optional(),
    limit: z.number().int().min(1).max(400).describe("Max variants to return (default 60).")
      .optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ family, section_id, brand_mode_id, query, limit }) => {
    if (section_id && !byId(SECTION_FRAMEWORKS, section_id)) {
      return {
        content: [{ type: "text" as const, text: `Unknown section_id ${section_id}` }],
        isError: true,
      };
    }

    let pool: ModuleVariant[] = section_id ? variantsForSection(section_id) : [...MODULE_VARIANTS];

    if (family) {
      const needle = family.toLowerCase();
      const matchIds = new Set(
        MODULE_FAMILIES.filter(
          (f) => f.id.toLowerCase() === needle || f.name.toLowerCase().includes(needle),
        ).map((f) => f.id),
      );
      pool = pool.filter((v) => matchIds.has(v.familyId));
    }

    const profile = brand_mode_id ? BRAND_PROFILES[brand_mode_id] : undefined;
    const restricted = new Set(profile?.contentScope.restrictedFamilyIds ?? []);
    const preferred = new Set(profile?.contentScope.preferredVariantIds ?? []);
    if (restricted.size) pool = pool.filter((v) => !restricted.has(v.familyId));

    if (query) {
      const q = query.toLowerCase();
      pool = pool.filter((v) =>
        `${v.id} ${v.name} ${v.description}`.toLowerCase().includes(q),
      );
    }

    // Division-preferred modules float to the top so callers see the
    // on-brand options first.
    if (preferred.size) {
      pool = [...pool].sort(
        (a, b) => (preferred.has(a.id) ? 0 : 1) - (preferred.has(b.id) ? 0 : 1),
      );
    }

    const total = pool.length;
    const max = limit ?? 60;
    return textResult({
      total,
      returned: Math.min(total, max),
      filters: {
        family: family ?? null,
        section_id: section_id ?? null,
        brand_mode_id: brand_mode_id ?? null,
        query: query ?? null,
      },
      variants: pool.slice(0, max).map((v) => ({
        id: v.id,
        familyId: v.familyId,
        familyName: byId(MODULE_FAMILIES, v.familyId)?.name ?? null,
        name: v.name,
        layoutHint: v.permittedLayoutIds[0] ?? null,
        permittedLayoutIds: v.permittedLayoutIds,
        hasNativePptxRenderer: hasNativeVariantEmitter(v.id),
        divisionPreferred: preferred.has(v.id),
        useThisWhen: useThisWhen(v),
        // Per-field schema so a caller knows exactly which keys to send and how
        // long each may be, without reading taxonomy source.
        capacity: resolveCapacity(v),
      })),
    });
  },
});
