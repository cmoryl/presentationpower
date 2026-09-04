import { describe, expect, it } from "vitest";
import { MODULE_VARIANTS } from "@/lib/taxonomy";
import { AUTHORED_COPY_IDS, hasAuthoredCopy, moduleCopy } from "@/lib/module-copy";

describe("module library copy", () => {
  it("gives every variant a non-empty caption and description", () => {
    for (const v of MODULE_VARIANTS) {
      const copy = moduleCopy(v);
      expect(copy.caption.trim().length, v.id).toBeGreaterThan(8);
      expect(copy.description.trim().length, v.id).toBeGreaterThan(30);
    }
  });

  it("authored ids all exist in the taxonomy", () => {
    for (const id of AUTHORED_COPY_IDS) {
      expect(MODULE_VARIANTS.some((v) => v.id === id), id).toBe(true);
    }
  });

  it("authored copy is distinct from the taxonomy spec note", () => {
    for (const v of MODULE_VARIANTS.filter((v) => hasAuthoredCopy(v.id))) {
      const copy = moduleCopy(v);
      expect(copy.caption).not.toBe(v.description);
      expect(copy.description).not.toBe(v.description);
    }
  });

  it("the maturity curve carries its own authored text", () => {
    const v = MODULE_VARIANTS.find((x) => x.id === "MV-MATURITY-CURVE")!;
    expect(hasAuthoredCopy(v.id)).toBe(true);
    expect(moduleCopy(v).caption.toLowerCase()).toContain("today");
    expect(moduleCopy(v).description.toLowerCase()).toContain("you are here");
  });

  it("captions stay short enough for a two-line card clamp", () => {
    for (const v of MODULE_VARIANTS) {
      expect(moduleCopy(v).caption.length, v.id).toBeLessThan(140);
    }
  });
});
