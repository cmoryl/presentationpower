// Visual regression guard for dark-mode aurora backdrops.
// -------------------------------------------------------
// FREE-FORM AURORA v2 (2026-07): the preview's AuroraLayer and the PPTX
// exporter's auroraSvgDataUrl must produce the SAME atmospheric surface —
// same base tint, same orb geometry, same blur radius, same layer opacity.
// The frosted-glass wash and edge vignette were removed in v2 so content
// sits directly on the accent blooms (matches the reference backdrops).
// Any drift in these numbers is a visible regression, so this test asserts
// them against a locked baseline per brand and snapshots the composite.

import { describe, it, expect } from "vitest";
import { auroraOrbs, auroraSvgDataUrl, auroraBaseTint, auroraLayerOpacity } from "../aurora-svg";
import { BRAND_MODES } from "../taxonomy";

const SEED = "MV-OP-COVER-MINIMAL";

function decodeSvg(dataUrl: string): string {
  return decodeURIComponent(dataUrl.replace("data:image/svg+xml;charset=utf-8,", ""));
}

/** Pull the numeric visual params out of the exported SVG payload. */
function extractDarkVisuals(svg: string) {
  const blurMatch = svg.match(/stdDeviation="([\d.]+)"/);
  const layerOpacityMatch = svg.match(/<g filter="url\(#aurora-blur\)" opacity="([\d.]+)"/);
  const orbR = svg.match(/<radialGradient id="orb-0"[^>]*r="([^"]+)"/)?.[1];
  const stops = [...svg.matchAll(/<stop offset="([^"]+)"[^/]*\/>/g)].map((m) => m[1]);
  const rectFills = [
    ...svg.matchAll(/<rect width="1280" height="720" fill="([^"]+)"(?: fill-opacity="([\d.]+)")?/g),
  ].map((m) => ({ fill: m[1], alpha: m[2] ? Number(m[2]) : 1 }));
  return {
    blurStd: blurMatch ? Number(blurMatch[1]) : null,
    layerOpacity: layerOpacityMatch ? Number(layerOpacityMatch[1]) : null,
    orbR: orbR ?? null,
    midStop: stops[1] ?? null,
    outerStop: stops[2] ?? null,
    baseFill: rectFills[0]?.fill ?? null,
    rectCount: rectFills.length,
  };
}

// Locked baseline (free-form v2 dark mode). Any change MUST be intentional
// and reviewed alongside the snapshot diff below.
const DARK_BASELINE = {
  blurStd: 55,
  layerOpacity: 0.95,
  orbR: "90%",
  midStop: "38%",
  outerStop: "78%",
  baseFill: "#03002C",
} as const;

describe("aurora dark-mode visual regression (preview ↔ exported PPTX, free-form v2)", () => {
  it("locks canonical dark-mode blur/opacity/stop geometry", () => {
    for (const brand of BRAND_MODES) {
      const svg = decodeSvg(auroraSvgDataUrl(SEED, brand, "dark"));
      const v = extractDarkVisuals(svg);
      expect(v.blurStd, `blur drift for ${brand.id}`).toBe(DARK_BASELINE.blurStd);
      expect(v.layerOpacity, `layer opacity drift for ${brand.id}`).toBe(
        DARK_BASELINE.layerOpacity,
      );
      expect(v.orbR, `orb radial extent drift for ${brand.id}`).toBe(DARK_BASELINE.orbR);
      expect(v.midStop, `mid stop drift for ${brand.id}`).toBe(DARK_BASELINE.midStop);
      expect(v.outerStop, `outer stop drift for ${brand.id}`).toBe(DARK_BASELINE.outerStop);
      expect(v.baseFill?.toUpperCase(), `base tint drift for ${brand.id}`).toBe(
        DARK_BASELINE.baseFill,
      );
      expect(auroraLayerOpacity("dark")).toBe(DARK_BASELINE.layerOpacity);
      expect(auroraBaseTint(brand, "dark").toUpperCase()).toBe(DARK_BASELINE.baseFill);
    }
  });

  it("emits only one full-bleed rect (base tint) — no wash, no vignette", () => {
    for (const brand of BRAND_MODES) {
      const svg = decodeSvg(auroraSvgDataUrl(SEED, brand, "dark"));
      const v = extractDarkVisuals(svg);
      expect(v.rectCount, `stray overlay rect for ${brand.id}`).toBe(1);
      expect(svg).not.toContain('id="vignette"');
    }
  });

  it("orb alphas stay in the tuned free-form band", () => {
    for (const brand of BRAND_MODES) {
      const orbs = auroraOrbs(SEED, brand, "dark");
      expect(orbs).toHaveLength(3);
      for (const o of orbs) {
        // v2 free-form: orbs are anchored to edges/corners and mostly
        // overhang the 1280×720 crop, so x/y can sit outside the frame.
        // Radii range 540–860 rx / 460–740 ry.
        expect(o.rx, `orb rx drift for ${brand.id}`).toBeGreaterThanOrEqual(540);
        expect(o.rx, `orb rx drift for ${brand.id}`).toBeLessThanOrEqual(860);
        expect(o.ry, `orb ry drift for ${brand.id}`).toBeGreaterThanOrEqual(460);
        expect(o.ry, `orb ry drift for ${brand.id}`).toBeLessThanOrEqual(740);
        // Alphas: base 0.82 + up to 0.15 range.
        expect(o.alpha, `orb alpha drift for ${brand.id}`).toBeGreaterThanOrEqual(0.82);
        expect(o.alpha, `orb alpha drift for ${brand.id}`).toBeLessThanOrEqual(0.98);
      }
    }
  });

  it("snapshots the per-brand dark-mode visual fingerprint", () => {
    const fingerprint = BRAND_MODES.map((brand) => {
      const svg = decodeSvg(auroraSvgDataUrl(SEED, brand, "dark"));
      const v = extractDarkVisuals(svg);
      const orbs = auroraOrbs(SEED, brand, "dark").map((o) => ({
        color: o.color.toUpperCase(),
        x: Math.round(o.x),
        y: Math.round(o.y),
        rx: Math.round(o.rx),
        ry: Math.round(o.ry),
        alpha: Number(o.alpha.toFixed(3)),
      }));
      return {
        brand: brand.id,
        blurStd: v.blurStd,
        layerOpacity: v.layerOpacity,
        orbR: v.orbR,
        midStop: v.midStop,
        outerStop: v.outerStop,
        baseFill: v.baseFill?.toUpperCase(),
        orbs,
      };
    });
    expect(fingerprint).toMatchSnapshot();
  });
});
