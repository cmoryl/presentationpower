// Regression suite: every exported radius token must match the stage layout.
// ---------------------------------------------------------------------------
// Four radius families ship in a PPTX and each drifts differently:
//
//   media / band / chip  roundRect + rectRadius  -> integer `adj` quantisation
//   pills                roundRect at half-height -> the 50000 `adj` clamp
//   hubs                 ellipse                 -> unequal w/h = oval corner
//   plates               raster decor capture    -> whole-device-pixel snapping
//
// This suite walks every token across the real footprints they are emitted at
// and holds the total drift under a sub-pixel budget, so a corner can never
// disagree between the on-screen stage and PowerPoint.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXPORT_RADIUS_IN,
  EXPORT_RADIUS_PX,
  PX_PER_IN,
  circleRadiusDriftPx,
  pillDriftPx,
  pillRadiusIn,
  plateDriftPx,
  pxToRadiusIn,
  radiusDriftPx,
  renderedRadiusPx,
  type ExportRadiusToken,
} from "../export-radius";
import { EXPORT_QUALITIES, stagePixelRatio } from "../export-quality";
import {
  CHIP_RADIUS_PX,
  MEDIA_RADIUS_CLASS,
  MEDIA_RADIUS_PX,
  SUMMARY_BAND,
} from "../surface-tokens";

/** Visible-drift budget on the 1920px stage. */
const BUDGET_PX = 0.25;

const EXPORTER = readFileSync(resolve(process.cwd(), "src/lib/pptx-export.ts"), "utf8");

/** Footprints (inches) each token is actually emitted at in the exporter. */
const FOOTPRINTS: Record<ExportRadiusToken, Array<{ name: string; w: number; h: number }>> = {
  media: [
    { name: "full-bleed plate", w: 13.333, h: 7.5 },
    { name: "half plate", w: 6.2, h: 4.6 },
    { name: "bento cell 3-up", w: 3.9, h: 2.35 },
    { name: "bento cell 4-up", w: 2.85, h: 2.35 },
    { name: "bento cell 8-up", w: 2.85, h: 1.62 },
    { name: "portrait proof", w: 3.2, h: 4.3 },
  ],
  band: [
    { name: "summary band", w: 10.6, h: 1.1 },
    { name: "full-width band", w: 11.8, h: 0.95 },
    { name: "house band", w: 12.33, h: 1.35 },
  ],
  chip: [
    { name: "logo tile", w: 0.62, h: 0.62 },
    { name: "gantt bar", w: 2.1, h: 0.28 },
    { name: "kicker chip", w: 1.15, h: 0.34 },
    { name: "stat chip", w: 2.6, h: 0.52 },
  ],
};

/** Pill footprints: half-rounded lists, orbit labels and CTA buttons. */
const PILLS: Array<{ name: string; w: number; h: number }> = [
  { name: "vs list pill", w: 4.3, h: 0.46 },
  { name: "vs list pill (dense)", w: 4.3, h: 0.28 },
  { name: "orbit label", w: 2.4, h: 0.42 },
  { name: "cta button", w: 3.1, h: 0.9 },
  { name: "square pill", w: 0.9, h: 0.9 },
];

/** Hub geometry emitted as ellipses: ring, satellite node, orbit dot. */
const HUBS: Array<{ name: string; r: number }> = [
  { name: "hub ring (max)", r: 2.4 },
  { name: "hub ring (tight)", r: 1.35 },
  { name: "satellite node", r: 0.12 },
  { name: "orbit dot", r: 0.07 },
];

describe("exported radius tokens match the stage layout", () => {
  it("covers every radius family the exporter emits", () => {
    expect(Object.keys(EXPORT_RADIUS_PX).sort()).toEqual(["band", "chip", "media"]);
    // Each family has at least one real footprint under test.
    for (const token of Object.keys(EXPORT_RADIUS_PX) as ExportRadiusToken[]) {
      expect(FOOTPRINTS[token].length, `${token} has no footprints`).toBeGreaterThan(0);
    }
    expect(PILLS.length).toBeGreaterThan(0);
    expect(HUBS.length).toBeGreaterThan(0);
  });

  it("derives each token from the stage design token, not an inch literal", () => {
    expect(EXPORT_RADIUS_PX.media).toBe(MEDIA_RADIUS_PX);
    expect(EXPORT_RADIUS_PX.band).toBe(SUMMARY_BAND.radius);
    expect(EXPORT_RADIUS_PX.chip).toBe(CHIP_RADIUS_PX);
    expect(MEDIA_RADIUS_CLASS).toBe(`rounded-[${MEDIA_RADIUS_PX}px]`);
    for (const token of Object.keys(EXPORT_RADIUS_PX) as ExportRadiusToken[]) {
      expect(EXPORT_RADIUS_IN[token]).toBeCloseTo(pxToRadiusIn(EXPORT_RADIUS_PX[token]), 9);
      // Round trip: inches back to stage px is the token itself.
      expect(EXPORT_RADIUS_IN[token] * PX_PER_IN).toBeCloseTo(EXPORT_RADIUS_PX[token], 6);
    }
  });

  it("keeps media / band / chip corners under the sub-pixel budget", () => {
    const worst: Array<{ label: string; drift: number }> = [];
    for (const token of Object.keys(EXPORT_RADIUS_PX) as ExportRadiusToken[]) {
      const px = EXPORT_RADIUS_PX[token];
      for (const f of FOOTPRINTS[token]) {
        const drift = radiusDriftPx(px, f.w, f.h);
        worst.push({ label: `${token} @ ${f.name}`, drift });
        expect(drift, `${token} drifts ${drift.toFixed(4)}px on ${f.name}`).toBeLessThan(BUDGET_PX);
      }
    }
    // Sanity: the matrix is wide enough that at least one case exercises
    // non-trivial quantisation rather than a lucky exact hit.
    expect(Math.max(...worst.map((w) => w.drift))).toBeGreaterThan(0);
  });

  it("keeps pills exactly half their short side", () => {
    for (const p of PILLS) {
      const drift = pillDriftPx(p.w, p.h);
      expect(drift, `${p.name} pill drifts ${drift.toFixed(4)}px`).toBeLessThan(BUDGET_PX);
      const painted = renderedRadiusPx(pillRadiusIn(p.h), p.w, p.h);
      expect(painted).toBeGreaterThan(0);
      // Never squares off, never exceeds half the short side.
      expect(painted).toBeLessThanOrEqual((Math.min(p.w, p.h) / 2) * PX_PER_IN + BUDGET_PX);
    }
  });

  it("keeps hub ellipses perfectly circular", () => {
    for (const h of HUBS) {
      expect(circleRadiusDriftPx(h.r * 2, h.r * 2)).toBe(0);
      // An oval of even 0.01in would breach the budget — proves the metric bites.
      expect(circleRadiusDriftPx(h.r * 2 + 0.01, h.r * 2)).toBeGreaterThan(BUDGET_PX);
    }
  });

  it("emits every exported hub ellipse with matching width and height", () => {
    const calls = EXPORTER.split(/s\.addShape\("ellipse",\s*\{/).slice(1);
    expect(calls.length).toBeGreaterThan(20);
    const offenders: string[] = [];
    for (const body of calls) {
      const block = body.slice(0, body.indexOf("});"));
      const w = /\bw:\s*([^,\n]+)/.exec(block)?.[1]?.trim();
      const h = /\bh:\s*([^,\n]+)/.exec(block)?.[1]?.trim();
      if (!w || !h) continue;
      if (w !== h) offenders.push(`w: ${w} / h: ${h}`);
    }
    expect(offenders, `non-circular ellipses in the exporter:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("keeps raster plate corners aligned with their vector shape at every DPI", () => {
    for (const q of EXPORT_QUALITIES) {
      const scale = stagePixelRatio(q.id);
      for (const token of Object.keys(EXPORT_RADIUS_PX) as ExportRadiusToken[]) {
        const px = EXPORT_RADIUS_PX[token];
        for (const f of FOOTPRINTS[token]) {
          const drift = plateDriftPx(px, scale, f.w, f.h);
          expect(
            drift,
            `${token} plate @ ${f.name} / ${q.id} (${scale}×) drifts ${drift.toFixed(4)}px`,
          ).toBeLessThan(BUDGET_PX);
        }
      }
    }
  });

  it("blocks reintroducing a literal rectRadius in the exporter", () => {
    const literals = [...EXPORTER.matchAll(/rectRadius:\s*([^,\n]+)/g)]
      .map((m) => m[1].trim())
      .filter((v) => !/^EXPORT_RADIUS_IN\.|^pillRadiusIn\(/.test(v));
    expect(literals, `untokenised rectRadius values: ${literals.join(", ")}`).toEqual([]);
  });

  it("snapshots the token drift fingerprint", () => {
    const fingerprint = (Object.keys(EXPORT_RADIUS_PX) as ExportRadiusToken[]).map((token) => ({
      token,
      px: EXPORT_RADIUS_PX[token],
      in: Number(EXPORT_RADIUS_IN[token].toFixed(6)),
      maxDrift: Number(
        Math.max(
          ...FOOTPRINTS[token].map((f) => radiusDriftPx(EXPORT_RADIUS_PX[token], f.w, f.h)),
        ).toFixed(4),
      ),
    }));
    expect(fingerprint).toMatchSnapshot();
  });
});
