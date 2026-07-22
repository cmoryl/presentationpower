// Visual regression guard for dark-mode aurora backdrops.
// -------------------------------------------------------
// The preview's AuroraLayer and the PPTX exporter's auroraSvgDataUrl must
// produce the SAME atmospheric surface — same base tint, same orb geometry,
// same blur radius, same per-brand frosted glass wash color/alpha, same
// vignette. Any drift in these numbers is a visible regression (orbs
// flatten into a single field, or one side over-washes) so this test
// snapshots them AND asserts them against a locked baseline per brand.
//
// We do a structural compare (numeric params extracted from the serialized
// SVG + auroraOrbs()) rather than pixel diff because:
//   1. Node has no canvas to rasterize the SVG.
//   2. The serialized values are the ground truth both sides consume; if
//      they match, the rendered pixels match by construction.

import { describe, it, expect } from "vitest";
import {
  auroraOrbs,
  auroraSvgDataUrl,
  auroraBaseTint,
  auroraLayerOpacity,
  darkGlassWash,
} from "../aurora-svg";
import { BRAND_MODES } from "../taxonomy";

const SEED = "MV-OP-COVER-MINIMAL";

function decodeSvg(dataUrl: string): string {
  return decodeURIComponent(
    dataUrl.replace("data:image/svg+xml;charset=utf-8,", ""),
  );
}

/** Pull the numeric visual params out of the exported SVG payload. */
function extractDarkVisuals(svg: string) {
  const blurMatch = svg.match(/stdDeviation="([\d.]+)"/);
  const layerOpacityMatch = svg.match(/<g filter="url\(#aurora-blur\)" opacity="([\d.]+)"/);
  const orbR = svg.match(/<radialGradient id="orb-0"[^>]*r="([^"]+)"/)?.[1];
  const stops = [...svg.matchAll(/<stop offset="([^"]+)"[^/]*\/>/g)].map((m) => m[1]);
  // Two full-bleed rects follow the orb <g>: [0] base fill, [1] glass wash,
  // vignette rect is filled via url(#vignette) so it's easy to isolate.
  const rectFills = [...svg.matchAll(/<rect width="1280" height="720" fill="([^"]+)"(?: fill-opacity="([\d.]+)")?/g)]
    .map((m) => ({ fill: m[1], alpha: m[2] ? Number(m[2]) : 1 }));
  return {
    blurStd: blurMatch ? Number(blurMatch[1]) : null,
    layerOpacity: layerOpacityMatch ? Number(layerOpacityMatch[1]) : null,
    orbR: orbR ?? null,
    // First 3 stops belong to orb-0's radial gradient (0%, midStop, outerStop, 100%).
    midStop: stops[1] ?? null,
    outerStop: stops[2] ?? null,
    baseFill: rectFills[0]?.fill ?? null,
    glassFill: rectFills[1]?.fill ?? null,
    glassAlpha: rectFills[1]?.alpha ?? null,
  };
}

// Locked baseline (dark mode). Any change to these MUST be intentional and
// reviewed alongside the snapshot diff below.
const DARK_BASELINE = {
  blurStd: 38,
  layerOpacity: 0.7,
  orbR: "55%",
  midStop: "22%",
  outerStop: "50%",
  baseFill: "#03002C",
} as const;

describe("aurora dark-mode visual regression (preview ↔ exported PPTX)", () => {
  it("locks canonical dark-mode blur/opacity/stop geometry", () => {
    for (const brand of BRAND_MODES) {
      const svg = decodeSvg(auroraSvgDataUrl(SEED, brand, "dark"));
      const v = extractDarkVisuals(svg);
      expect(v.blurStd, `blur drift for ${brand.id}`).toBe(DARK_BASELINE.blurStd);
      expect(v.layerOpacity, `layer opacity drift for ${brand.id}`).toBe(DARK_BASELINE.layerOpacity);
      expect(v.orbR, `orb radial extent drift for ${brand.id}`).toBe(DARK_BASELINE.orbR);
      expect(v.midStop, `mid stop drift for ${brand.id}`).toBe(DARK_BASELINE.midStop);
      expect(v.outerStop, `outer stop drift for ${brand.id}`).toBe(DARK_BASELINE.outerStop);
      expect(v.baseFill?.toUpperCase(), `base tint drift for ${brand.id}`).toBe(DARK_BASELINE.baseFill);
      // Preview-side must agree on the same layer opacity constant.
      expect(auroraLayerOpacity("dark")).toBe(DARK_BASELINE.layerOpacity);
      expect(auroraBaseTint(brand, "dark").toUpperCase()).toBe(DARK_BASELINE.baseFill);
    }
  });

  it("keeps per-brand glass wash within the tuned dark-mode envelope (no single-field flattening)", () => {
    for (const brand of BRAND_MODES) {
      const svg = decodeSvg(auroraSvgDataUrl(SEED, brand, "dark"));
      const v = extractDarkVisuals(svg);
      const wash = darkGlassWash(brand);

      // Serialized wash matches the per-brand helper both sides consume.
      expect(v.glassFill?.toUpperCase(), `glass wash color drift for ${brand.id}`)
        .toBe(wash.color.toUpperCase());
      expect(v.glassAlpha, `glass wash alpha drift for ${brand.id}`).toBeCloseTo(wash.alpha, 5);

      // Envelope: alpha must stay low enough that orbs still peek through.
      // Above ~0.18 and the wash starts flattening the aurora into a single
      // colour field — the exact regression this test guards.
      expect(wash.alpha, `glass wash too heavy for ${brand.id} (would flatten orbs)`).toBeLessThanOrEqual(0.15);
      expect(wash.alpha, `glass wash missing for ${brand.id}`).toBeGreaterThanOrEqual(0.05);
    }
  });

  it("orb geometry stays inside the frame and alphas stay in the tuned band", () => {
    for (const brand of BRAND_MODES) {
      const orbs = auroraOrbs(SEED, brand, "dark");
      expect(orbs).toHaveLength(3);
      for (const o of orbs) {
        expect(o.x, `orb x out of frame for ${brand.id}`).toBeGreaterThanOrEqual(0);
        expect(o.x, `orb x out of frame for ${brand.id}`).toBeLessThanOrEqual(1280);
        expect(o.y, `orb y out of frame for ${brand.id}`).toBeGreaterThanOrEqual(0);
        expect(o.y, `orb y out of frame for ${brand.id}`).toBeLessThanOrEqual(720);
        // Dark-mode orb radii were tightened (380–620 rx / 320–520 ry) so
        // orbs stay defined rather than smearing across the slide.
        expect(o.rx, `orb rx drift for ${brand.id}`).toBeGreaterThanOrEqual(380);
        expect(o.rx, `orb rx drift for ${brand.id}`).toBeLessThanOrEqual(620);
        expect(o.ry, `orb ry drift for ${brand.id}`).toBeGreaterThanOrEqual(320);
        expect(o.ry, `orb ry drift for ${brand.id}`).toBeLessThanOrEqual(520);
        // Alphas: base 0.62 + up to 0.18 range.
        expect(o.alpha, `orb alpha drift for ${brand.id}`).toBeGreaterThanOrEqual(0.62);
        expect(o.alpha, `orb alpha drift for ${brand.id}`).toBeLessThanOrEqual(0.8);
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
        glassFill: v.glassFill?.toUpperCase(),
        glassAlpha: Number((v.glassAlpha ?? 0).toFixed(4)),
        orbs,
      };
    });
    expect(fingerprint).toMatchSnapshot();
  });
});
