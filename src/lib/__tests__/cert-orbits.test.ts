// MV-PROOF-CERT-ORBITS — the credential proof split must be a first-class
// module: present in the taxonomy, described in the library copy, seeded with
// starter content and exported as native PowerPoint objects.

import { describe, expect, it } from "vitest";
import { MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import { moduleCopy } from "@/lib/module-copy";
import { seedContent } from "@/lib/deck-store";
import { hasNativeVariantEmitter } from "@/lib/export-native-variants";
import "@/components/slide/modules/register-all";
import { findSlideModule } from "@/components/slide/module-registry";

const ID = "MV-PROOF-CERT-ORBITS";

describe("credential proof split module", () => {
  it("is registered in the taxonomy under the proof family", () => {
    const v = byId(MODULE_VARIANTS, ID);
    expect(v).toBeDefined();
    expect(v!.familyId).toBe("MF-05");
    expect(v!.editableFields).toContain("certs[].label");
    expect(v!.editableFields).toContain("cardHighlights[]");
  });

  it("has a renderer claiming the variant", () => {
    expect(findSlideModule(ID)?.id).toBe("family:certifications");
  });

  it("has library caption and description copy", () => {
    const copy = moduleCopy(byId(MODULE_VARIANTS, ID)!);
    expect(copy.caption).toMatch(/certification/i);
    expect(copy.description.length).toBeGreaterThan(60);
  });

  it("seeds a card and three credentials with bullet points", () => {
    const brief = { prospect: "Acme Corp" } as never;
    const c = seedContent(ID, brief, "Proof") as unknown as Record<string, unknown>;
    expect(String(c.title).length).toBeGreaterThan(3);
    expect(String(c.cardTitle).length).toBeGreaterThan(3);
    expect(c.cardHighlights).toHaveLength(2);
    expect((c.cardPoints as string[]).length).toBe(4);
    const certs = c.certs as Array<{ label: string; points: string[] }>;
    expect(certs).toHaveLength(3);
    for (const cert of certs) {
      expect(cert.label).toMatch(/ISO/);
      expect(cert.points.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("exports as native PowerPoint objects, not a flattened picture", () => {
    expect(hasNativeVariantEmitter(ID)).toBe(true);
  });
});
