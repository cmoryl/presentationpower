import { describe, expect, it } from "vitest";

import { PRINT_SECTION_MODULES } from "@/lib/print-library/section-modules";
import {
  SOCIAL_TALL_PLANS,
  applyTallPlan,
  socialTallSection,
  tallPlanFor,
} from "@/lib/social-tall-layouts";

const variant = (id: string) => PRINT_SECTION_MODULES.find((m) => m.variantId === id);

describe("social tall layouts", () => {
  it("every plan points at real modules in the same family", () => {
    for (const plan of SOCIAL_TALL_PLANS) {
      const from = variant(plan.from);
      const to = variant(plan.to);
      expect(from, plan.from).toBeTruthy();
      expect(to, plan.to).toBeTruthy();
      expect(to!.family).toBe(from!.family);
      expect(to!.density).not.toBe("compact");
    }
  });

  it("swaps the variant and keeps the strip's own copy", () => {
    const plan = tallPlanFor("quote-inline-compact")!;
    const strip = variant("quote-inline-compact")!.make();
    const edited = { ...strip, text: "Bespoke quote copy" } as typeof strip;
    const out = applyTallPlan(edited, plan) as unknown as Record<string, unknown>;
    expect(out.variantId).toBe("quote-attribution-card");
    expect(out.kind).toBe("quote");
    expect(out.text).toBe("Bespoke quote copy");
    expect(out.id).toBe((edited as unknown as Record<string, unknown>).id);
  });

  it("fills fields the strip never carried from the tall defaults", () => {
    const plan = tallPlanFor("contact-expert-card")!;
    const strip = variant("contact-expert-card")!.make();
    const out = applyTallPlan(strip, plan) as unknown as Record<string, unknown>;
    expect(out.variantId).toBe("contact-global-panel");
    expect(Array.isArray(out.rows)).toBe(true);
    expect((out.rows as unknown[]).length).toBeGreaterThan(0);
    expect(out.email).toBe((strip as unknown as Record<string, unknown>).email);
  });

  it("only applies on tall aspect classes", () => {
    const strip = variant("expertise-icon-strip")!.make();
    expect(socialTallSection(strip, "landscape-wide").plan).toBeUndefined();
    expect(socialTallSection(strip, "landscape").plan).toBeUndefined();
    expect(socialTallSection(strip, "portrait-tall").plan?.to).toBe("expertise-checklist");
    expect(socialTallSection(strip, "square").plan?.to).toBe("expertise-checklist");
  });

  it("leaves modules without a plan untouched", () => {
    const hero = variant("hero-photo-band")!.make();
    const out = socialTallSection(hero, "portrait");
    expect(out.plan).toBeUndefined();
    expect(out.section).toBe(hero);
  });
});
