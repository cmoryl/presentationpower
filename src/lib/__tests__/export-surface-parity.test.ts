// Surface parity (preview ↔ export).
//
// The `.glass` / `.glass-dark` utilities in `src/styles.css` define the card
// surface: the navy gradient pair, the hairline border alpha, the drop shadow
// and the backdrop blur. `export-surface.ts` mirrors those numbers so an
// exported card carries the SAME gradient stops, stroke and elevation instead of
// the flat top-stop solid it used to. This test parses the CSS and fails if
// either side drifts — the same spirit as glass-token-parity.test.ts.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AMBIENT_ALPHA,
  SURFACE_CSS_TOKENS,
  SURFACE_HAIRLINE_IN,
  cssAngleToOoxml,
  getSurfaceTreatment,
  gradFillXml,
  gradientTag,
  ambientTag,
  outerShdwXml,
  parseAmbientTag,
  parseGradientTag,
  stripSurfaceTags,
  surfaceEligible,
  surfaceTier,
  SURFACE_CARD_MIN_IN,
  SLIDE_W_IN,
  SLIDE_H_IN,
  pxToPt,
} from "@/lib/export-surface";
import { withDesignSurfaces } from "@/lib/pptx-shape-normalize";
import { rasterTargetPx } from "@/lib/pptx-vector-flatten";

const CSS = fs.readFileSync(path.join(process.cwd(), "src/styles.css"), "utf8");

function block(header: RegExp): string {
  const m = CSS.match(header);
  if (!m) throw new Error(`Missing CSS block for ${header}`);
  let depth = 1;
  let i = m.index! + m[0].length;
  const start = i;
  while (i < CSS.length && depth > 0) {
    const ch = CSS[i++];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
  }
  return CSS.slice(start, i - 1);
}

const GLASS_DARK = block(/@utility\s+glass-dark\s*\{/);
const GLASS = block(/@utility\s+glass\s*\{/);
const GLASS_LIGHT_OPAQUE = block(
  /\.contrast-boost\s+\.glass\s*,\s*\.contrast-boost\.glass\s*\{/,
);

describe("export surface parity (CSS ↔ PPTX)", () => {
  it("dark gradient stops are byte-identical to `.glass-dark`", () => {
    expect(GLASS_DARK).toContain(`#${SURFACE_CSS_TOKENS.dark.gradientTop.toLowerCase()}`);
    expect(GLASS_DARK).toContain(`#${SURFACE_CSS_TOKENS.dark.gradientBottom.toLowerCase()}`);
    const t = getSurfaceTreatment({ w: 4, h: 2.5, fill: SURFACE_CSS_TOKENS.dark.gradientTop, dark: true })!;
    expect(t.gradient.stops.map((s) => s.color)).toEqual([
      SURFACE_CSS_TOKENS.dark.gradientTop,
      SURFACE_CSS_TOKENS.dark.gradientBottom,
    ]);
    // 180deg in CSS is top→bottom; PowerPoint writes that as 5400000.
    expect(cssAngleToOoxml(t.gradient.angleDeg)).toBe(5400000);
  });

  it("dark hairline stroke matches `border: 1px solid color-mix(white 22%)`", () => {
    expect(GLASS_DARK).toMatch(/border:\s*1px solid color-mix\(in oklab, white 22%/);
    const t = getSurfaceTreatment({ w: 4, h: 2.5, fill: "141435", dark: true })!;
    expect(t.line.color).toBe("FFFFFF");
    expect(t.line.transparency).toBe(78); // 100 - 22
    expect(t.line.width).toBeCloseTo(pxToPt(1), 3);
  });

  it("dark elevation matches `0 30px 60px -25px rgba(0,0,0,0.6)`", () => {
    expect(GLASS_DARK).toContain("0 30px 60px -25px rgba(0, 0, 0, 0.6)");
    const t = getSurfaceTreatment({ w: 4, h: 2.5, fill: "141435", dark: true })!;
    expect(t.shadow.color).toBe("000000");
    expect(t.shadow.opacity).toBe(0.6);
    expect(t.shadow.offset).toBeCloseTo(pxToPt(30), 1);
    expect(t.shadow.blur).toBeCloseTo(pxToPt(60), 1);
    expect(t.shadow.angle).toBe(90);
  });

  it("light stroke + elevation match the opaque `.glass` variant", () => {
    expect(GLASS_LIGHT_OPAQUE).toMatch(/border-color:\s*color-mix\(in oklab, #03002c 22%/);
    expect(GLASS).toContain("0 20px 40px -20px color-mix(in oklab, #03002c 30%, transparent)");
    const t = getSurfaceTreatment({ w: 4, h: 2.5, fill: "FFFFFF", dark: false })!;
    expect(t.line.color).toBe("03002C");
    expect(t.line.transparency).toBe(78);
    expect(t.shadow.color).toBe("03002C");
    expect(t.shadow.offset).toBeCloseTo(pxToPt(20), 1);
    expect(t.shadow.blur).toBeCloseTo(pxToPt(40), 1);
  });

  it("light gradient falls the same 6 points of whiteness the CSS does", () => {
    // `.contrast-boost .glass` fades white 98% → 92%.
    expect(GLASS_LIGHT_OPAQUE).toContain("white 98%");
    expect(GLASS_LIGHT_OPAQUE).toContain("white 92%");
    expect(SURFACE_CSS_TOKENS.light.inkMixBottom).toBeCloseTo(0.98 - 0.92, 6);
    const t = getSurfaceTreatment({ w: 4, h: 2.5, fill: "FFFFFF", dark: false })!;
    expect(t.gradient.stops[0].color).toBe("FFFFFF");
    expect(t.gradient.stops[1].color).not.toBe("FFFFFF");
  });

  it("backdrop-filter blur is approximated as a wide, low-alpha wash", () => {
    expect(GLASS_DARK).toContain("backdrop-filter: blur(28px)");
    expect(GLASS).toContain("backdrop-filter: blur(22px)");
    expect(SURFACE_CSS_TOKENS.dark.backdropBlurPx).toBe(28);
    expect(SURFACE_CSS_TOKENS.light.backdropBlurPx).toBe(22);
    const t = getSurfaceTreatment({ w: 4, h: 2.5, fill: "141435", dark: true })!;
    expect(t.ambient.offset).toBe(0);
    expect(t.ambient.opacity).toBe(AMBIENT_ALPHA);
    expect(t.ambient.blur).toBeGreaterThan(t.shadow.blur * 0.3);
  });

  it("full-slide scrims and hairlines get no surface treatment", () => {
    expect(surfaceEligible(13.333, 7.5)).toBe(false);
    expect(surfaceEligible(4, SURFACE_HAIRLINE_IN - 0.01)).toBe(false);
    expect(getSurfaceTreatment({ w: 13.333, h: 7.5, fill: "141435", dark: true })).toBeNull();
    expect(getSurfaceTreatment({ w: 6, h: 0.03, fill: "141435", dark: true })).toBeNull();
  });

  it("tags round-trip and never leak into the visible object name", () => {
    const t = getSurfaceTreatment({ w: 4, h: 2.5, fill: "141435", dark: true })!;
    const name = `${gradientTag(t.gradient)}${ambientTag(t.ambient)} TP Card`;
    expect(parseGradientTag(name)!.stops[1].color).toBe("03002C");
    expect(parseAmbientTag(name)!.opacity).toBeCloseTo(AMBIENT_ALPHA, 2);
    expect(stripSurfaceTags(name)).toBe("TP Card");
  });

  it("emits editable OOXML gradient stops and an outer shadow", () => {
    const t = getSurfaceTreatment({ w: 4, h: 2.5, fill: "141435", dark: true })!;
    const grad = gradFillXml(t.gradient);
    expect(grad).toContain('<a:gs pos="0"><a:srgbClr val="141435">');
    expect(grad).toContain('<a:gs pos="100000"><a:srgbClr val="03002C">');
    expect(grad).toContain('<a:lin ang="5400000" scaled="0"/>');
    const shdw = outerShdwXml(t.shadow);
    expect(shdw).toMatch(/^<a:outerShdw blurRad="\d+" dist="\d+" dir="5400000"/);
    expect(shdw).toContain('<a:alpha val="60000"/>');
  });
});

// -----------------------------------------------------------------------------
// Tiering: cards float, chips do not.
//
// The renderer paints small elements FLAT (`IconWell`, chip/pill/badge helpers
// in flagship.tsx: one solid tint plus a 1px ring, `boxShadow: none`). Only
// card-class boxes carry the glass gradient and elevation, so the exporter has
// to make the same cut or every chip reads as floating.
// -----------------------------------------------------------------------------
describe("surface tiering (card vs chip)", () => {
  it("classifies by minimum side against SURFACE_CARD_MIN_IN", () => {
    expect(SURFACE_CARD_MIN_IN).toBe(0.55);
    expect(surfaceTier(4, 2.5)).toBe("card");
    expect(surfaceTier(2, 0.3)).toBe("chip");
    expect(surfaceTier(6, 0.03)).toBe("none");
    expect(surfaceTier(SLIDE_W_IN, SLIDE_H_IN)).toBe("none");
    expect(getSurfaceTreatment({ w: 2, h: 0.3, fill: "A1FBF9", dark: true })!.tier).toBe("chip");
    expect(getSurfaceTreatment({ w: 4, h: 2.5, fill: "141435", dark: true })!.tier).toBe("card");
  });

  function capture(dark: boolean) {
    const calls: { type: unknown; o: Record<string, unknown> }[] = [];
    const stub = {
      addShape(type: unknown, o: Record<string, unknown>) {
        calls.push({ type, o });
      },
    };
    const slide = withDesignSurfaces(stub as never, { dark });
    return { slide, calls };
  }

  it("a 0.3in chip gets a hairline but NO shadow, gradient or ambient wash", () => {
    const { slide, calls } = capture(true);
    slide.addShape("rect" as never, { x: 1, y: 1, w: 1.6, h: 0.3, fill: { color: "A1FBF9" } } as never);
    const o = calls[0].o;
    expect(o.shadow).toBeUndefined();
    expect(o.line).toBeTruthy();
    const name = String(o.objectName ?? "");
    expect(parseGradientTag(name)).toBeNull();
    expect(parseAmbientTag(name)).toBeNull();
  });

  it("a 4x2.5in card painted in a neutral surface fill exports as the glass panel", () => {
    const { slide, calls } = capture(true);
    slide.addShape("rect" as never, { x: 1, y: 1, w: 4, h: 2.5, fill: { color: "141435" } } as never);
    const o = calls[0].o;
    expect(o.shadow).toBeTruthy();
    const name = String(o.objectName ?? "");
    const grad = parseGradientTag(name)!;
    // Dark glass: accent bloom → navy base → navy base, all translucent.
    expect(grad.stops).toHaveLength(3);
    expect(grad.stops.every((s) => (s.alpha ?? 1) < 1)).toBe(true);
    expect(parseAmbientTag(name)!.offset).toBe(0);
  });

  it("a coloured (non-glass) tile keeps the generic 2-stop treatment", () => {
    const { slide, calls } = capture(true);
    slide.addShape("rect" as never, { x: 1, y: 1, w: 4, h: 2.5, fill: { color: "EC388A" } } as never);
    const name = String(calls[0].o.objectName ?? "");
    expect(parseGradientTag(name)!.stops).toHaveLength(2);
  });

});

// -----------------------------------------------------------------------------
// Vector flatten sizing: the raster follows the drawn box, not a flat constant.
// -----------------------------------------------------------------------------
describe("vector flatten raster sizing", () => {
  it("scales with the drawn extent and the export DPI, with a ceiling", () => {
    // A 24px icon glyph on the 1920px stage is ~0.17in.
    expect(rasterTargetPx(0.17, "high")).toBeLessThan(128);
    // A wide logo lockup or aurora backdrop must not be crushed to 512px.
    expect(rasterTargetPx(13.333, "high")).toBeGreaterThan(512);
    expect(rasterTargetPx(13.333, "ultra")).toBeLessThanOrEqual(4096);
    expect(rasterTargetPx(4, "ultra")).toBeGreaterThan(rasterTargetPx(4, "standard"));
    // Unresolvable placement falls back to icon scale rather than upscaling.
    expect(rasterTargetPx(undefined, "high")).toBe(512);
  });
});
