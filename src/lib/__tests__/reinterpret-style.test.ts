import { describe, expect, it } from "vitest";
import {
  applyColorLock,
  applyTypeRhythm,
  designStyle,
  typeRhythm,
} from "@/lib/reinterpret-style";
import type { MappedSlide } from "@/lib/pptx-mapping";

const slide = (index: number, title: string, bullets: string[]): MappedSlide =>
  ({
    sectionId: "SF-05",
    variantId: "MV-INS-CALLOUT",
    layoutId: "LF-01",
    content: { title },
    rationale: "test",
    source: { index, title, bullets, notes: "", images: [] },
  }) as unknown as MappedSlide;

describe("reinterpret style controls", () => {
  it("leaves copy untouched on the free rhythm", () => {
    const m = [slide(0, "x".repeat(200), ["a", "b", "c", "d", "e", "f", "g"])];
    expect(applyTypeRhythm(m, "free")).toEqual(m);
  });

  it("clamps titles and bullet counts uniformly", () => {
    const r = typeRhythm("compact");
    const out = applyTypeRhythm(
      [slide(0, "word ".repeat(40), ["a", "b", "c", "d", "e", "f", "g"])],
      "compact",
    );
    expect(out[0].source.title.length).toBeLessThanOrEqual(r.titleChars);
    expect(out[0].source.bullets).toHaveLength(r.maxBullets);
  });

  it("stamps a valid accent and mode on every slide, rejecting bad hex", () => {
    const m = [slide(0, "a", []), slide(1, "b", [])];
    const ok = applyColorLock(m, { accent: "#EC388A", mode: "dark" });
    expect(ok.every((s) => s.content.accentOverride === "#ec388a")).toBe(true);
    expect(ok.every((s) => s.mode === "dark")).toBe(true);
    const bad = applyColorLock(m, { accent: "red" });
    expect(bad.every((s) => s.content.accentOverride === undefined)).toBe(true);
  });

  it("resolves unknown style ids to balanced (no bias)", () => {
    expect(designStyle("nope").id).toBe("balanced");
    expect(designStyle("kpi").variantIds).toContain("MV-KPI-DASHBOARD");
  });
});
