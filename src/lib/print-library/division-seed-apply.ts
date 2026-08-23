// Apply admin-authored division seed copy to a fresh editable copy.
//
// Brand colours and lockups resolve at render time (see proposal-brand.tsx), but
// page *copy* lives in the saved document so the user can edit it. The override
// is therefore stamped in once, when "Use template" makes the copy.

import type { DivisionSeed } from "@/lib/division-seeds";

type Rec = Record<string, unknown>;

/** Rewrite the "Why <division>" page from the division seed override. */
export function applyDivisionSeedToContent<T extends Rec>(
  content: T,
  seed?: DivisionSeed | null,
): T {
  if (!seed) return content;
  const pages = content["pages"];
  if (!Array.isArray(pages)) return content;

  const name = seed.displayName?.trim();
  const nextPages = pages.map((page) => {
    if (!page || typeof page !== "object") return page;
    const p = page as Rec;
    if (p["kind"] !== "why") return page;
    const out: Rec = { ...p };
    const eyebrow = seed.whyEyebrow?.trim() || (name ? `Why ${name}` : undefined);
    if (eyebrow) {
      out["eyebrow"] = eyebrow;
      out["navLabel"] = eyebrow;
    }
    if (seed.whyTitle?.trim()) out["title"] = seed.whyTitle.trim();
    if (seed.whyLines?.length) out["bullets"] = seed.whyLines;
    if (seed.whyCards?.length) out["cards"] = seed.whyCards;
    return out;
  });

  return { ...content, pages: nextPages };
}
