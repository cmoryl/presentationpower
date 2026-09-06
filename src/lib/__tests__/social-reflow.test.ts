import { describe, expect, it } from "vitest";

import { PRINT_SECTION_MODULES } from "@/lib/print-library/section-modules";
import { preferredDensity, reflowPlanFor, socialReflowSection } from "@/lib/social-reflow";
import type { AspectClass } from "@/lib/social-formats";

const ALL: AspectClass[] = ["square", "portrait", "portrait-tall", "landscape", "landscape-wide"];
const variant = (id: string) => PRINT_SECTION_MODULES.find((m) => m.variantId === id)!;

describe("social reflow", () => {
  it("wants stacked layouts tall, condensed on a wide banner", () => {
    expect(preferredDensity("portrait-tall")).toBe("tall");
    expect(preferredDensity("square")).toBe("tall");
    expect(preferredDensity("landscape")).toBe("standard");
    expect(preferredDensity("landscape-wide")).toBe("compact");
  });

  it("only ever relayouts inside the same family and to the wanted density", () => {
    for (const m of PRINT_SECTION_MODULES) {
      for (const cls of ALL) {
        const plan = reflowPlanFor(m.variantId, cls);
        if (!plan) continue;
        const to = variant(plan.to);
        expect(to.family).toBe(m.family);
        if (plan.source === "derived") expect(to.density).toBe(preferredDensity(cls));
      }
    }
  });

  it("keeps curated thin-strip plans on tall frames", () => {
    const plan = reflowPlanFor("quote-inline-compact", "portrait-tall")!;
    expect(plan.source).toBe("curated");
    expect(plan.to).toBe("quote-attribution-card");
  });

  it("is a no-op when the module already suits the shape", () => {
    const tallModule = PRINT_SECTION_MODULES.find((m) => m.density === "tall")!;
    expect(reflowPlanFor(tallModule.variantId, "portrait")).toBeUndefined();
  });

  it("carries the author's copy onto the relaid-out variant", () => {
    const strip = variant("quote-inline-compact").make();
    const edited = { ...strip, text: "Author copy" } as typeof strip;
    const out = socialReflowSection(edited, "portrait") as unknown as {
      section: Record<string, unknown>;
      plan?: { to: string };
    };
    expect(out.plan?.to).toBe("quote-attribution-card");
    expect(out.section.text).toBe("Author copy");
    expect(out.section.id).toBe((edited as unknown as Record<string, unknown>).id);
  });

  it("is deterministic", () => {
    for (const m of PRINT_SECTION_MODULES.slice(0, 12)) {
      for (const cls of ALL) {
        expect(reflowPlanFor(m.variantId, cls)?.to).toBe(reflowPlanFor(m.variantId, cls)?.to);
      }
    }
  });
});
