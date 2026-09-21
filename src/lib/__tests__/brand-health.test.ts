import { describe, expect, it } from "vitest";

import {
  APPROVED_TEXT_INK,
  accentSwatches,
  approvedInk,
  isLargeText,
  scoreBrandHealth,
  type BrandHealthSample,
} from "@/lib/brand-health";
import { getBrandGuide, MASTER_TRANSPERFECT_GUIDE } from "@/lib/brand-guides";

const guide = MASTER_TRANSPERFECT_GUIDE;

function sample(over: Partial<BrandHealthSample> = {}): BrandHealthSample {
  return {
    id: "s1",
    label: "Heading",
    text: "Transforming global performance",
    fg: "#03002C",
    bg: "#FFFFFF",
    fontFamily: "Geist, sans-serif",
    fontSizePx: 32,
    fontWeight: 600,
    ...over,
  };
}

describe("scoreBrandHealth", () => {
  it("gives approved ink on white a clean pass", () => {
    const r = scoreBrandHealth([sample()], guide);
    expect(r.score).toBe(100);
    expect(r.grade).toBe("pass");
    expect(r.failures).toBe(0);
    expect(r.passed.length).toBeGreaterThan(0);
  });

  it("fails text that misses WCAG AA on its own ground", () => {
    const r = scoreBrandHealth([sample({ fg: "#C8C8C8", bg: "#FFFFFF" })], guide);
    expect(r.grade).toBe("blocked");
    expect(r.findings.some((f) => f.check === "contrast" && f.severity === "fail")).toBe(true);
    expect(r.score).toBeLessThan(100);
  });

  it("flags an accent colour used as text", () => {
    const accent = accentSwatches(guide)[0]!.hex;
    const r = scoreBrandHealth([sample({ fg: accent, bg: "#FFFFFF" })], guide);
    expect(r.findings.some((f) => f.check === "accent-on-text")).toBe(true);
  });

  it("flags a typeface the guide does not record", () => {
    const r = scoreBrandHealth([sample({ fontFamily: "Comic Sans MS" })], guide);
    expect(r.findings.some((f) => f.check === "typeface")).toBe(true);
    // "Geist" is the same face as the recorded "Geist Sans" and must not flag.
    const ok = scoreBrandHealth([sample({ fontFamily: '"Geist", sans-serif' })], guide);
    expect(ok.findings.some((f) => f.check === "typeface")).toBe(false);
  });

  it("reads the division guide it is handed", () => {
    const gl = getBrandGuide("globallink") ?? guide;
    const r = scoreBrandHealth([sample()], gl);
    expect(r.guideTitle).toBe(gl.title);
  });

  it("treats large text with the 3:1 threshold", () => {
    expect(isLargeText(26, 400)).toBe(true);
    expect(isLargeText(19, 700)).toBe(true);
    expect(isLargeText(14, 400)).toBe(false);
  });

  it("keeps white and Blue 800 in the approved ink list", () => {
    const ink = approvedInk(guide).map((c) => c.toLowerCase());
    expect(ink).toContain("#ffffff");
    expect(ink).toContain(APPROVED_TEXT_INK[0]!.toLowerCase());
    expect(ink).toContain("#003fc7");
  });

  it("does not sink a warning-only surface below 40", () => {
    const warnOnly = Array.from({ length: 30 }, (_, i) =>
      sample({ id: `w${i}`, fontFamily: "Playfair Display" }),
    );
    const r = scoreBrandHealth(warnOnly, guide);
    expect(r.failures).toBe(0);
    expect(r.grade).toBe("review");
    expect(r.score).toBe(40);
  });

  it("never scores below zero", () => {
    const bad = Array.from({ length: 40 }, (_, i) =>
      sample({ id: `s${i}`, fg: "#EEEEEE", bg: "#FFFFFF" }),
    );
    expect(scoreBrandHealth(bad, guide).score).toBe(0);
  });
});
