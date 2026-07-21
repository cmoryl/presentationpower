// Regression: every BrandMode must produce a complete, division-specific
// preview. If this fails, open the amber banner in /library — the same
// BrandCoverageIssue codes point at the exact file+field to fix.

import { describe, expect, it } from "vitest";
import { BRAND_MODES } from "@/lib/taxonomy";
import {
  validateDivisionContent,
  COVERAGE_FIX_HINTS,
  type BrandCoverageReport,
} from "@/lib/library-preview";

function formatReport(r: BrandCoverageReport): string {
  const lines = r.issues.map((code) => {
    const hint = COVERAGE_FIX_HINTS[code];
    if (!hint) return `  · ${code}`;
    const field = hint.field.replace(/<brandId>/g, r.brandId);
    return `  · ${code}\n      file:  ${hint.file}\n      field: ${field}\n      hint:  ${hint.hint}`;
  });
  const notes = r.notes.length ? `\n    notes: ${r.notes.join(" · ")}` : "";
  return `${r.brandName} (${r.brandId})${notes}\n${lines.join("\n")}`;
}

describe("library-preview division coverage", () => {
  const result = validateDivisionContent();

  it("audits every BrandMode declared in taxonomy", () => {
    const audited = new Set(result.reports.map((r) => r.brandId));
    for (const b of BRAND_MODES) {
      expect(audited.has(b.id), `missing coverage report for ${b.id}`).toBe(true);
    }
  });

  it("reports zero BrandCoverageIssues across all BRAND_MODES", () => {
    if (result.ok) {
      expect(result.failing).toEqual([]);
      return;
    }
    const detail = result.failing.map(formatReport).join("\n\n");
    throw new Error(
      `Division content coverage failed for ${result.failing.length} brand mode(s):\n\n${detail}\n`,
    );
  });
});
