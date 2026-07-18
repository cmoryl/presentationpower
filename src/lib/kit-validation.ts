// Kit × Section validation.
//
// Each preset kit slide references a sectionId (SF-XX) and variantId (MV-…).
// A slide is only valid when the variant's familyId is listed in the
// section's `permittedFamilyIds`. This module is the single source of truth
// used at import time to reject mismatches and at load time to surface
// authoring mistakes in the kit registry.

import { SECTION_FRAMEWORKS, MODULE_VARIANTS, byId } from "./taxonomy";
import type { TemplatePayload } from "./deck-store";

export type KitValidationIssue = {
  index: number; // slide index (0-based)
  sectionId: string;
  variantId: string;
  familyId: string | null;
  permittedFamilyIds: string[] | null;
  reason:
    | "unknown-section"
    | "unknown-variant"
    | "family-not-permitted";
  message: string;
};

export type KitValidationResult = {
  valid: boolean;
  issues: KitValidationIssue[];
};

export function validateKitPayload(payload: TemplatePayload): KitValidationResult {
  const issues: KitValidationIssue[] = [];

  payload.slides.forEach((s, i) => {
    const section = byId(SECTION_FRAMEWORKS, s.sectionId);
    const variant = byId(MODULE_VARIANTS, s.variantId);

    if (!section) {
      issues.push({
        index: i,
        sectionId: s.sectionId,
        variantId: s.variantId,
        familyId: variant?.familyId ?? null,
        permittedFamilyIds: null,
        reason: "unknown-section",
        message: `Slide ${i + 1}: unknown section "${s.sectionId}".`,
      });
      return;
    }
    if (!variant) {
      issues.push({
        index: i,
        sectionId: s.sectionId,
        variantId: s.variantId,
        familyId: null,
        permittedFamilyIds: section.permittedFamilyIds,
        reason: "unknown-variant",
        message: `Slide ${i + 1}: unknown variant "${s.variantId}".`,
      });
      return;
    }
    if (!section.permittedFamilyIds.includes(variant.familyId)) {
      issues.push({
        index: i,
        sectionId: s.sectionId,
        variantId: s.variantId,
        familyId: variant.familyId,
        permittedFamilyIds: section.permittedFamilyIds,
        reason: "family-not-permitted",
        message: `Slide ${i + 1}: variant ${s.variantId} (family ${variant.familyId}) is not permitted in section ${section.id} — ${section.name}. Allowed families: ${section.permittedFamilyIds.join(", ")}.`,
      });
    }
  });

  return { valid: issues.length === 0, issues };
}

export function formatKitValidationError(
  kitTitle: string,
  result: KitValidationResult,
): string {
  if (result.valid) return "";
  const head = `Kit "${kitTitle}" failed section validation (${result.issues.length} issue${result.issues.length === 1 ? "" : "s"}):`;
  const body = result.issues.slice(0, 8).map((i) => `• ${i.message}`).join("\n");
  const more =
    result.issues.length > 8 ? `\n… and ${result.issues.length - 8} more.` : "";
  return `${head}\n${body}${more}`;
}
