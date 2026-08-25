// Temporary verification: export the rewritten case-study + triptych native
// renderers to a real PPTX for visual QA, then delete this file.
import { describe, it } from "vitest";
import { writeFileSync } from "node:fs";
import { BRAND_MODES, MODULE_VARIANTS } from "@/lib/taxonomy";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";

const IDS = ["MV-CASE-SPREAD", "MV-CASE-METRICS", "MV-CASE-STORY", "MV-NUMBERS-TRIPTYCH"];

describe("tmp case export", () => {
  it("writes /tmp/case-export.pptx", async () => {
    const brand = BRAND_MODES.find((b) => b.id === "bm-enterprise") ?? BRAND_MODES[0]!;
    const brief = resolveDivisionBrief(brand);
    const slides = IDS.map((id, i) => {
      const variant = MODULE_VARIANTS.find((v) => v.id === id)!;
      return {
        id: `slide-${id}`,
        position: i,
        sectionId: "SF-09",
        variantId: id,
        layoutId: variant.permittedLayoutIds[0],
        content: seedDivisionContent(id, brief, "Verification", brand) as Record<string, unknown>,
        changes: [],
      };
    });
    const { exportDeckToPptx } = await import("@/lib/pptx-export");
    const deck = {
      id: "verify-case",
      createdAt: new Date().toISOString(),
      title: "Case export verify",
      briefId: "verify",
      brandModeId: brand.id,
      archetypeId: "single-module",
      slides,
    } as never;
    const res = await exportDeckToPptx(deck, brand, { output: "blob", fidelity: "editable" });
    if (!res.blob) throw new Error(`no blob; failed=${res.failedSlides?.join(",")}`);
    const buf = Buffer.from(await res.blob.arrayBuffer());
    writeFileSync("/tmp/case-export.pptx", buf);
    if (res.failedSlides?.length) throw new Error(`failed slides: ${res.failedSlides.join(",")}`);
  }, 120_000);
});
