import { describe, expect, it } from "vitest";

import {
  SOCIAL_FULL_BLEED_PLANS,
  fullBleedGeometry,
  fullBleedMode,
  fullBleedPlanFor,
  fullBleedSection,
} from "@/lib/social-full-bleed";
import { SOCIAL_FORMATS, aspectClass, getFormat } from "@/lib/social-formats";
import { socialSafeRect } from "@/lib/social-module-fit";
import type { PrintSection } from "@/lib/print-assets.types";

const portrait = SOCIAL_FORMATS.find((f) => aspectClass(f) === "portrait") ?? SOCIAL_FORMATS[0];
const banner =
  SOCIAL_FORMATS.find((f) => aspectClass(f) === "landscape-wide") ?? SOCIAL_FORMATS[0];

describe("social full-bleed plans", () => {
  it("covers the photographic hero and the monitor showcase", () => {
    expect(SOCIAL_FULL_BLEED_PLANS.map((p) => p.variantId).sort()).toEqual([
      "device-monitor-showcase",
      "hero-photo-fade",
    ]);
  });

  it("only applies on tall shapes", () => {
    expect(fullBleedPlanFor("hero-photo-fade", aspectClass(portrait))).toBeTruthy();
    expect(fullBleedPlanFor("hero-photo-fade", aspectClass(banner))).toBeUndefined();
    expect(fullBleedPlanFor("hero-photo-band", aspectClass(portrait))).toBeUndefined();
  });

  it("anchors the photo copy zone low and inside the frame", () => {
    const plan = fullBleedPlanFor("hero-photo-fade", aspectClass(portrait))!;
    const safe = socialSafeRect(portrait);
    const g = fullBleedGeometry(portrait, plan, safe);
    expect(g.kind).toBe("photo");
    expect(g.top).toBeGreaterThan(portrait.height * 0.35);
    expect(g.top + g.height).toBeLessThanOrEqual(portrait.height);
    expect(g.width).toBeLessThanOrEqual(safe.width);
    expect(g.composedHeight).toBe(portrait.height);
  });

  it("over-scans the monitor past both side edges", () => {
    const plan = fullBleedPlanFor("device-monitor-showcase", aspectClass(portrait))!;
    const g = fullBleedGeometry(portrait, plan, socialSafeRect(portrait));
    expect(g.kind).toBe("device");
    expect(g.width).toBeGreaterThan(portrait.width);
    expect(g.left).toBeLessThan(0);
    // Vertically centred.
    expect(Math.abs(g.top - (portrait.height - g.height) / 2)).toBeLessThanOrEqual(1);
  });

  it("collapses the hero's own band and reverses its type", () => {
    const plan = SOCIAL_FULL_BLEED_PLANS.find((p) => p.kind === "photo")!;
    const section = { id: "h", kind: "hero", variantId: "hero-photo-fade", heightPct: 62 } as unknown as PrintSection;
    const out = fullBleedSection(section, plan) as unknown as { heightPct: number };
    expect(out.heightPct).toBeLessThan(5);
    expect(fullBleedMode(plan, "light")).toBe("dark");
  });

  it("leaves the device section and face untouched", () => {
    const plan = SOCIAL_FULL_BLEED_PLANS.find((p) => p.kind === "device")!;
    const section = { id: "d", kind: "device", variantId: "device-monitor-showcase" } as unknown as PrintSection;
    expect(fullBleedSection(section, plan)).toBe(section);
    expect(fullBleedMode(plan, "light")).toBe("light");
  });

  it("every plan variant is a real format-agnostic module id", () => {
    for (const p of SOCIAL_FULL_BLEED_PLANS) {
      const g = fullBleedGeometry(getFormat(portrait.id) ?? portrait, p, socialSafeRect(portrait));
      expect(g.height).toBeGreaterThan(100);
    }
  });
});
