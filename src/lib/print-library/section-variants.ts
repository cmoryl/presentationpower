// One lookup from a print section `kind` to its variant list, so the module
// studio (and any future picker) can offer variant swaps without repeating the
// per-kind switch that PrintSectionRenderer uses internally.

import {
  PRINT_CONTACT_VARIANTS,
  PRINT_EXPERTISE_VARIANTS,
  PRINT_FEATURE_VARIANTS,
  PRINT_HERO_VARIANTS,
  PRINT_LOGO_VARIANTS,
  PRINT_NARRATIVE_VARIANTS,
  PRINT_QUOTE_VARIANTS,
  PRINT_STATS_VARIANTS,
  PRINT_TABLE_VARIANTS,
} from "@/components/print/sections/PrintSectionRenderer";
import type { PrintSection } from "@/lib/print-assets.types";

export type SectionVariantOption = { id: string; label: string; description: string };

export function sectionVariantsFor(kind: PrintSection["kind"]): SectionVariantOption[] {
  switch (kind) {
    case "hero":
      return PRINT_HERO_VARIANTS;
    case "stats":
      return PRINT_STATS_VARIANTS;
    case "quote":
      return PRINT_QUOTE_VARIANTS;
    case "logo-grid":
      return PRINT_LOGO_VARIANTS;
    case "expertise":
      return PRINT_EXPERTISE_VARIANTS;
    case "feature-list":
      return PRINT_FEATURE_VARIANTS;
    case "narrative":
      return PRINT_NARRATIVE_VARIANTS;
    case "table":
      return PRINT_TABLE_VARIANTS;
    case "contact":
      return PRINT_CONTACT_VARIANTS;
    default:
      return [];
  }
}
