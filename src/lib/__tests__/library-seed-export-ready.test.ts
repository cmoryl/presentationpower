// Every library module, in every brand scope, must seed content that clears
// the export gates. A deck built from the /library grid goes straight to
// export, so an unseeded repeated collection or a blank required field there
// is a dead end for the user (download buttons disabled, no way forward).
//
// Two classes of bug this locks down:
//   • collections that don't live on `items` (rows/series/points) were counted
//     as empty and blocked every chart/map module;
//   • blank asset slots were auto-filled with prose, which rendered as 404
//     images in the client comparison strip.

import { describe, it, expect } from "vitest";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";
import { BRAND_MODES, MODULE_VARIANTS } from "@/lib/taxonomy";
import { runQa } from "@/lib/qa";
import { BRAND_PROFILES } from "@/lib/brand-profiles";

describe("library seeding is export-ready", () => {
  it("no module blocks export in any brand scope it is permitted in", () => {
    const failures: string[] = [];
    for (const brand of BRAND_MODES) {
      const brief = resolveDivisionBrief(brand);
      const restricted = new Set(
        BRAND_PROFILES[brand.id]?.contentScope.restrictedFamilyIds ?? [],
      );
      for (const v of MODULE_VARIANTS) {
        if (restricted.has(v.familyId)) continue;
        const content = seedDivisionContent(v.id, brief, "Selected module", brand);
        const blocking = runQa(
          [{ id: "s", variantId: v.id, content } as never],
          brand.id,
        ).filter((i) => i.severity === "block");
        if (blocking.length) {
          failures.push(`${brand.id}/${v.id} :: ${blocking.map((i) => i.message).join(" | ")}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("never invents an asset reference for a logo slot", () => {
    const brand = BRAND_MODES[0]!;
    const content = seedDivisionContent(
      "MV-CLIENT-COMPARE",
      resolveDivisionBrief(brand),
      "Proof",
      brand,
    ) as Record<string, unknown>;
    for (const raw of (content.items ?? []) as Array<Record<string, unknown>>) {
      for (const key of ["logoUrl", "logoPath", "logoPaths", "logoVariant", "logoVariants"]) {
        const v = raw[key];
        if (v == null) continue;
        expect(String(v)).not.toBe(String(content.title));
      }
    }
  });
});
