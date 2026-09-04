import { describe, expect, it } from "vitest";
import { MODULE_VARIANTS } from "@/lib/taxonomy";
import { moduleCopy } from "@/lib/module-copy";
import { seedContent } from "@/lib/deck-store";

const ID = "MV-PROOF-GROWTH-ORBITS";

describe("growth orbits module", () => {
  it("is registered in the taxonomy with editable fields", () => {
    const v = MODULE_VARIANTS.find((x) => x.id === ID);
    expect(v).toBeDefined();
    for (const f of [
      "title",
      "subtitle",
      "logosLabel",
      "growthLabel",
      "statsTitle",
      "growth[].value",
      "orbits[].value",
      "orbits[].body",
    ]) {
      expect(v!.editableFields).toContain(f);
    }
  });

  it("has library copy", () => {
    const v = MODULE_VARIANTS.find((x) => x.id === ID)!;
    const copy = moduleCopy(v);
    expect(copy.caption).toBeTruthy();
    expect(copy.description.length).toBeGreaterThan(60);
  });

  it("seeds logos, growth rows and three orbit stats", () => {
    const c = seedContent(ID, {} as never, "Overview") as unknown as Record<string, unknown>;
    expect(Array.isArray(c.items)).toBe(true);
    expect((c.items as unknown[]).length).toBeGreaterThanOrEqual(4);
    expect((c.growth as unknown[]).length).toBe(3);
    expect((c.orbits as unknown[]).length).toBe(3);
  });
});
