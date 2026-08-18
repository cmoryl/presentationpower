// Visual regression guard: exported PPTX corner rounding must be pixel-exact.
// ---------------------------------------------------------------------------
// Corners are the most visible fidelity tell in an export: a media plate that
// rounds at 11px in PowerPoint but 22px on screen reads as a different design.
// Two failure modes are locked here:
//   1. DRIFT — pptxgenjs quantises the radius into an integer `adj` guide, so
//      a token radius must survive the round trip within a sub-pixel budget.
//   2. HARDCODING — any inch literal reintroduced into the exporter bypasses
//      the design tokens entirely, so the source is scanned for them.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXPORT_RADIUS_IN,
  PX_PER_IN,
  STAGE_W_PX,
  SLIDE_W_IN,
  pillRadiusIn,
  pxToRadiusIn,
  radiusDriftPx,
  rectRadiusAdj,
  renderedRadiusPx,
} from "../export-radius";
import { CHIP_RADIUS_PX, MEDIA_RADIUS_PX, SUMMARY_BAND } from "../surface-tokens";

/** Sub-pixel budget on the 1920px stage. Anything above this is visible. */
const DRIFT_BUDGET_PX = 0.25;

/** Shape footprints (inches) that actually occur in exported modules:
 *  bento cells, half-slide plates, bands, chips, gantt bars, logo tiles. */
const SHAPES: Array<{ name: string; w: number; h: number }> = [
  { name: "bento cell 3-up", w: 3.9, h: 2.35 },
  { name: "bento cell 4-up", w: 2.85, h: 2.35 },
  { name: "half plate", w: 6.2, h: 4.6 },
  { name: "full-width band", w: 11.8, h: 0.95 },
  { name: "summary band", w: 10.6, h: 1.1 },
  { name: "logo tile", w: 0.62, h: 0.62 },
  { name: "gantt bar", w: 2.1, h: 0.28 },
  { name: "narrow chip", w: 1.15, h: 0.34 },
];

const TOKEN_RADII: Array<{ name: string; px: number; inches: number }> = [
  { name: "media", px: MEDIA_RADIUS_PX, inches: EXPORT_RADIUS_IN.media },
  { name: "band", px: SUMMARY_BAND.radius, inches: EXPORT_RADIUS_IN.band },
  { name: "chip", px: CHIP_RADIUS_PX, inches: EXPORT_RADIUS_IN.chip },
];

describe("PPTX export corner rounding (no pixel drift)", () => {
  it("locks the stage↔slide scale the radii are derived from", () => {
    expect(STAGE_W_PX).toBe(1920);
    expect(SLIDE_W_IN).toBe(13.333);
    expect(PX_PER_IN).toBeCloseTo(144.0036, 3);
  });

  it("derives every exported radius from the app's design tokens", () => {
    for (const t of TOKEN_RADII) {
      expect(t.inches, `${t.name} radius is not token-derived`).toBeCloseTo(
        pxToRadiusIn(t.px),
        9,
      );
    }
    // Media plates and bento tiles share one radius (surface-token contract).
    expect(EXPORT_RADIUS_IN.media).toBe(pxToRadiusIn(22));
  });

  it("keeps rendered corners within a sub-pixel budget on every shape", () => {
    for (const t of TOKEN_RADII) {
      for (const s of SHAPES) {
        const drift = radiusDriftPx(t.px, s.w, s.h);
        expect(
          drift,
          `${t.name} radius drifts ${drift.toFixed(3)}px on ${s.name}`,
        ).toBeLessThanOrEqual(DRIFT_BUDGET_PX);
      }
    }
  });

  it("keeps fully-rounded pills exactly half-height (clamped, never squared off)", () => {
    for (const h of [0.34, 0.62, 0.9, 1.1]) {
      const w = 4.6;
      const adj = rectRadiusAdj(pillRadiusIn(h), w, h);
      expect(adj, `pill h=${h} lost its full round`).toBe(50000);
      expect(renderedRadiusPx(pillRadiusIn(h), w, h)).toBeCloseTo(
        (h / 2) * PX_PER_IN,
        6,
      );
    }
  });

  it("never hardcodes an inch radius literal in the exporter", () => {
    const sources = [
      "src/lib/pptx-export.ts",
      "src/lib/single-slide-pptx.ts",
      "src/lib/print-vector-text.ts",
    ];
    for (const rel of sources) {
      let src: string;
      try {
        src = readFileSync(resolve(process.cwd(), rel), "utf8");
      } catch {
        continue; // optional module
      }
      const literals = [...src.matchAll(/rectRadius:\s*([^,\n]+)/g)].map((m) =>
        m[1].trim(),
      );
      for (const value of literals) {
        expect(
          /^EXPORT_RADIUS_IN\.|^pillRadiusIn\(|^laneCornerRadiusIn\(|\.rectRadius$/.test(value),
          `${rel}: hardcoded rectRadius \`${value}\` — use EXPORT_RADIUS_IN or pillRadiusIn`,
        ).toBe(true);
      }
    }
  });

  it("snapshots the corner-rounding fingerprint", () => {
    const fingerprint = TOKEN_RADII.map((t) => ({
      token: t.name,
      px: t.px,
      inches: Number(t.inches.toFixed(6)),
      shapes: SHAPES.map((s) => ({
        shape: s.name,
        adj: rectRadiusAdj(t.inches, s.w, s.h),
        renderedPx: Number(renderedRadiusPx(t.inches, s.w, s.h).toFixed(3)),
      })),
    }));
    expect(fingerprint).toMatchSnapshot();
  });
});
