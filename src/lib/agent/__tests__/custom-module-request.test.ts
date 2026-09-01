import { describe, expect, it } from "vitest";
import { authorCustomModuleFromRequest } from "../custom-module-request";
import { BLANK_VARIANT_ID, CUSTOM_FAMILY_ID } from "@/lib/custom-modules";

describe("agent-authored custom modules", () => {
  it("authors a canvas module from a requested slide", () => {
    const p = authorCustomModuleFromRequest({
      title: "Regulatory review loop",
      lines: ["Submission intake", "Linguistic validation", "Agency response"],
      notes: "Walk the loop clockwise.",
      sectionId: "SF-06",
    });
    expect(p.baseVariantId).toBe(BLANK_VARIANT_ID);
    expect(p.familyId).toBe(CUSTOM_FAMILY_ID);
    expect(p.canvasBlocks.length).toBe(4); // heading + 3 lines
    expect(p.canvasBlocks[0]!.text).toBe("Regulatory review loop");
    expect(p.tags).toContain("agent-authored");
    expect(p.moduleKey.startsWith("CM-")).toBe(true);
  });

  it("flattens stats into copy lines and keeps blocks on stage", () => {
    const p = authorCustomModuleFromRequest({
      title: "Scale",
      stats: [{ value: "48%", label: "faster review" }, { value: "6,000+" }],
    });
    const texts = p.canvasBlocks.map((b) => b.text);
    expect(texts).toContain("48% — faster review");
    expect(texts).toContain("6,000+");
    for (const b of p.canvasBlocks) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w).toBeLessThanOrEqual(1920);
      expect(b.y + b.h).toBeLessThanOrEqual(1080);
    }
  });

  it("builds an image wall when there is no copy", () => {
    const p = authorCustomModuleFromRequest({
      title: "Clients",
      imageUrls: Array.from({ length: 6 }, (_, i) => `https://x/${i}.png`),
    });
    expect(p.canvasBlocks.filter((b) => b.kind === "image").length).toBe(6);
  });
});
