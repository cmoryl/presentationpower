import { describe, expect, it } from "vitest";

import { auditAi, auditAiGradient } from "@/lib/london-signage-qa";
import { buildLondonPanelAi, londonPanelStops } from "@/lib/next-london-revise";
import { LONDON_PANELS, LONDON_STYLES, type LondonPanel } from "@/lib/next-london-signage";
import {
  axialShadingDict,
  normalizeStops,
  parseColor,
  radialShadingDict,
  readShadingStops,
  stitchingFunction,
  stopsFromColors,
  type GradientStop,
} from "@/lib/pdf-gradient-shading";

function aiText(panel: LondonPanel): string {
  return Array.from(buildLondonPanelAi(panel), (b) => String.fromCharCode(b)).join("");
}

function stopsOf(dict: string): GradientStop[] {
  return readShadingStops(dict).map((rgb, i) => ({ offset: i, rgb }));
}

describe("exported .ai opens correctly in Illustrator", () => {
  it("passes the full audit for every panel in the kit", () => {
    for (const panel of LONDON_PANELS) {
      const report = auditAi(panel, buildLondonPanelAi(panel));
      const failed = report.checks.filter((c) => c.status === "fail");
      expect(failed.map((c) => `${panel.name}: ${c.id} → ${c.actual}`)).toEqual([]);
    }
  });

  it("keeps the approved panel gradient colours on every signage template", () => {
    for (const panel of LONDON_PANELS) {
      const text = aiText(panel);
      const checks = auditAiGradient(panel, text);
      const stops = readShadingStops(text);
      const want = londonPanelStops(panel).map((c) => parseColor(c));
      expect(stops.length, `${panel.name} stop count`).toBe(want.length);
      want.forEach((c, i) =>
        c.forEach((v, k) =>
          expect(Math.abs(v - stops[i]![k]!), `${panel.name} stop ${i} ch ${k}`).toBeLessThan(
            4 / 255,
          ),
        ),
      );
      expect(
        checks.filter((c) => c.status === "fail").map((c) => c.id),
        panel.name,
      ).toEqual([]);
    }
  });

  it("covers every declared style treatment, not just the ones in use", () => {
    const base = LONDON_PANELS[0]!;
    for (const style of Object.keys(LONDON_STYLES)) {
      const panel: LondonPanel = { ...base, style };
      const report = auditAi(panel, buildLondonPanelAi(panel));
      expect(
        report.checks.filter((c) => c.status === "fail").map((c) => c.id),
        style,
      ).toEqual([]);
    }
  });

  it("never emits a mesh shading or a non-RGB colour space", () => {
    for (const panel of LONDON_PANELS) {
      const text = aiText(panel);
      expect(/\/ShadingType\s*[4-7]/.test(text), panel.name).toBe(false);
      expect(/\/DeviceCMYK|\/Separation|\/DeviceN|\/ICCBased|\/Lab/.test(text), panel.name).toBe(
        false,
      );
      expect(/\/ShadingType\s*[23]/.test(text), panel.name).toBe(true);
    }
  });

  it("fails the audit when a gradient is re-coloured away from brand", () => {
    const panel = LONDON_PANELS[0]!;
    const tampered = aiText(panel).replace(/\/C0 \[[^\]]+\]/, "/C0 [1 0 0]");
    expect(auditAiGradient(panel, tampered).find((c) => c.id === "ai-gradient-stops")?.status).toBe(
      "fail",
    );
  });

  it("fails the audit when a gradient is converted to CMYK", () => {
    const panel = LONDON_PANELS[0]!;
    const tampered = aiText(panel).replace("/ColorSpace /DeviceRGB", "/ColorSpace /DeviceCMYK");
    expect(
      auditAiGradient(panel, tampered).find((c) => c.id === "ai-gradient-colorspace")?.status,
    ).toBe("fail");
  });
});

describe("Illustrator gradient edge cases", () => {
  it("parses every brand colour notation into DeviceRGB", () => {
    expect(parseColor("#003FC7")).toEqual(parseColor("#003fc7"));
    expect(parseColor("#fff")).toEqual([1, 1, 1]);
    expect(parseColor("#ffff")).toEqual([1, 1, 1]); // 4-digit hex, alpha dropped
    expect(parseColor("#003FC7FF")).toEqual(parseColor("#003FC7")); // 8-digit hex
    expect(parseColor("rgb(0, 63, 199)")).toEqual(parseColor("#003FC7"));
    expect(parseColor("rgba(0, 63, 199, 0.35)")).toEqual(parseColor("#003FC7"));
    expect(parseColor("rgb(100%, 0%, 0%)")).toEqual([1, 0, 0]);
    expect(parseColor("not a colour")).toEqual([0, 0, 0]);
  });

  it("writes a flat editable ramp for a single-stop gradient", () => {
    const dict = axialShadingDict({ x: 0, y: 0 }, { x: 100, y: 0 }, stopsFromColors(["#A1FBF9"]));
    expect(dict).toContain("/FunctionType 2");
    expect(dict).not.toContain("/FunctionType 3");
    expect(readShadingStops(dict)).toHaveLength(1);
  });

  it("writes a bare Type 2 for two stops and a stitched Type 3 beyond that", () => {
    const two = axialShadingDict(
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      stopsFromColors(["#003FC7", "#A1FBF9"]),
    );
    expect(two).not.toContain("/FunctionType 3");
    expect(readShadingStops(two)).toHaveLength(2);

    for (const n of [3, 4, 5, 8, 12, 24]) {
      const colors = Array.from({ length: n }, (_, i) =>
        `#${i.toString(16).padStart(2, "0")}${(255 - i * 3).toString(16).padStart(2, "0")}C7`,
      );
      const dict = axialShadingDict({ x: 0, y: 0 }, { x: 10, y: 0 }, stopsFromColors(colors));
      expect(dict, `${n} stops`).toContain("/FunctionType 3");
      const bounds = /\/Bounds \[([^\]]*)\]/.exec(dict)![1]!.trim().split(/\s+/).map(Number);
      expect(bounds, `${n} bounds count`).toHaveLength(n - 2);
      bounds.forEach((b, i) => {
        expect(b).toBeGreaterThan(i === 0 ? 0 : bounds[i - 1]!);
        expect(b).toBeLessThan(1);
      });
      expect(readShadingStops(dict), `${n} stop colours`).toHaveLength(n);
    }
  });

  it("normalises unsorted, duplicated, out-of-range and non-finite offsets", () => {
    const messy: GradientStop[] = [
      { offset: 1.4, rgb: [1, 0, 0] },
      { offset: -3, rgb: [0, 0, 1] },
      { offset: 0.5, rgb: [0, 1, 0] },
      { offset: 0.5, rgb: [1, 1, 0] },
      { offset: Number.NaN, rgb: [0, 0, 0] },
    ];
    const out = normalizeStops(messy);
    expect(out).toHaveLength(4);
    expect(out[0]!.offset).toBe(0);
    expect(out[out.length - 1]!.offset).toBe(1);
    out.forEach((s, i) => {
      if (i > 0) expect(s.offset).toBeGreaterThan(out[i - 1]!.offset);
      expect(s.offset).toBeGreaterThanOrEqual(0);
      expect(s.offset).toBeLessThanOrEqual(1);
    });
    // Order follows the offsets, so the blue 0-anchor leads the ramp.
    expect(out[0]!.rgb).toEqual([0, 0, 1]);
  });

  it("re-anchors a ramp that does not span the whole domain", () => {
    const out = normalizeStops([
      { offset: 0.3, rgb: [1, 0, 0] },
      { offset: 0.6, rgb: [0, 0, 1] },
    ]);
    expect(out[0]!.offset).toBe(0);
    expect(out[1]!.offset).toBe(1);
  });

  it("clamps out-of-gamut and 0–255 channel input", () => {
    const dict = stitchingFunction([
      { offset: 0, rgb: [-2, 0.5, 40] },
      { offset: 1, rgb: [300, 1.5, 0] },
    ]);
    for (const n of dict.match(/-?\d+(\.\d+)?/g) ?? []) {
      expect(Number(n)).toBeGreaterThanOrEqual(0);
    }
    expect(dict).not.toContain("NaN");
    expect(dict).not.toContain("e-");
    expect(dict).not.toContain("-0");
  });

  it("never emits an empty or degenerate shading", () => {
    expect(stitchingFunction([])).toContain("/FunctionType 2");
    const degenerate = axialShadingDict({ x: 5, y: 5 }, { x: 5, y: 5 }, stopsFromColors(["#000"]));
    const coords = /\/Coords \[([^\]]*)\]/.exec(degenerate)![1]!.split(/\s+/).map(Number);
    expect(coords[0] !== coords[2] || coords[1] !== coords[3]).toBe(true);

    const halo = radialShadingDict({ x: 0, y: 0 }, 0, stopsFromColors(["#000", "#fff"]));
    const r = Number(/\/Coords \[[^\]]*?([\d.]+)\]/.exec(halo)![1]);
    expect(r).toBeGreaterThan(0);
  });

  it("round-trips a dense 24-stop ramp without losing a colour", () => {
    const colors = Array.from(
      { length: 24 },
      (_, i) => `rgb(${i * 10}, ${255 - i * 10}, ${(i * 7) % 255})`,
    );
    const dict = radialShadingDict({ x: 0, y: 0 }, 100, stopsFromColors(colors));
    const back = stopsOf(dict);
    expect(back).toHaveLength(24);
    colors.forEach((c, i) => {
      const want = parseColor(c);
      want.forEach((v, k) => expect(Math.abs(v - back[i]!.rgb[k]!)).toBeLessThan(2 / 255));
    });
  });
});
