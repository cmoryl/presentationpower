import { useMemo } from "react";
import { PRINT_SECTION_MODULES } from "./print-library/section-modules";
import { applyPrintOverrides, useModuleOverrides } from "./module-overrides";
import { deriveSocialModuleLayouts } from "./social-module-layouts";

/** Social choices inherit the same visibility, content and metadata as their print masters. */
export function useSocialModuleMasters() {
  const { rows, isLoading } = useModuleOverrides("print");
  const { layouts, allLayouts } = useMemo(() => {
    const index = new Map(rows.filter((r) => r.scope === "print").map((r) => [r.module_id, r]));
    return {
      layouts: deriveSocialModuleLayouts(applyPrintOverrides(PRINT_SECTION_MODULES, index)),
      // Retirement removes new choices but preserves saved references.
      allLayouts: deriveSocialModuleLayouts(applyPrintOverrides(PRINT_SECTION_MODULES, index, { includeHidden: true })),
    };
  }, [rows]);
  return { layouts, allLayouts, isLoading };
}