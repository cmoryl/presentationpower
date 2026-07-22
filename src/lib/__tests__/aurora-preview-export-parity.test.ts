// Guard that the on-screen <AuroraLayer/> paints the SAME dark-mode wash
// parameters — base tint, layer opacity, orb geometry/alpha, blur radius,
// gradient stops, and per-brand frosted-glass film — as the values the
// PPTX exporter derives from the brand theme via auroraSvgDataUrl().
//
// AuroraLayer historically drifted from the exporter (hardcoded literals
// that the exporter had already moved off of). This test renders the real
// React component with renderToStaticMarkup and parses the emitted HTML,
// then asserts every wash param equals the theme-derived value for that
// brand in dark mode. Any drift fails the build.

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { SlideModeContext } from "@/components/slide/SlideChrome";
import { AuroraLayer } from "@/components/slide/flagship";
import {
  auroraBaseTint,
  auroraLayerOpacity,
  auroraOrbs,
  auroraSvgDataUrl,
  darkGlassWash,
} from "@/lib/aurora-svg";
import { BRAND_MODES } from "@/lib/taxonomy";

const SEED = "MV-OP-COVER-MINIMAL";

function renderAurora(brand: (typeof BRAND_MODES)[number]): string {
  return renderToStaticMarkup(
    createElement(
      SlideModeContext.Provider,
      { value: "dark" as const },
      createElement(AuroraLayer, { seed: SEED, brand }),
    ),
  );
}

function decodeSvg(dataUrl: string): string {
  return decodeURIComponent(
    dataUrl.replace("data:image/svg+xml;charset=utf-8,", ""),
  );
}

/** Pull numeric wash params out of the rendered AuroraLayer HTML. */
function extractPreview(html: string) {
  // Root wrapper carries the base tint via background style.
  const baseMatch = html.match(/style="background:([^"]+)"/);
  // <svg style="opacity:X"> is the orb <g> opacity in the preview (SVG root).
  const svgOpacityMatch = html.match(/<svg[^>]*style="opacity:([\d.]+)"/);
  const blurStd = html.match(/stdDeviation="([\d.]+)"/)?.[1];
  const orbR = html.match(/<radialGradient[^>]*r="([^"]+)"/)?.[1];
  const stops = [...html.matchAll(/<stop offset="([^"]+)"/g)].map((m) => m[1]);
  // The frosted-glass wash div follows the SVG and has both background AND
  // opacity set inline; the vignette div uses background-image, so filter.
  const washDiv = html.match(
    /<div class="absolute inset-0" style="background:([^;]+);opacity:([\d.]+)"><\/div>/,
  );
  return {
    base: baseMatch?.[1]?.trim().toUpperCase() ?? null,
    layerOpacity: svgOpacityMatch ? Number(svgOpacityMatch[1]) : null,
    blurStd: blurStd ? Number(blurStd) : null,
    orbR: orbR ?? null,
    midStop: stops[1] ?? null,
    outerStop: stops[2] ?? null,
    washColor: washDiv?.[1]?.trim().toUpperCase() ?? null,
    washAlpha: washDiv ? Number(washDiv[2]) : null,
  };
}

/** Pull the same params from the exporter's theme-derived SVG payload. */
function extractExport(svg: string) {
  const layerOpacity = svg.match(
    /<g filter="url\(#aurora-blur\)" opacity="([\d.]+)"/,
  )?.[1];
  const blurStd = svg.match(/stdDeviation="([\d.]+)"/)?.[1];
  const orbR = svg.match(/<radialGradient id="orb-0"[^>]*r="([^"]+)"/)?.[1];
  const stops = [...svg.matchAll(/<stop offset="([^"]+)"/g)].map((m) => m[1]);
  const rects = [
    ...svg.matchAll(
      /<rect width="1280" height="720" fill="([^"]+)"(?: fill-opacity="([\d.]+)")?/g,
    ),
  ];
  return {
    base: rects[0]?.[1]?.toUpperCase() ?? null,
    layerOpacity: layerOpacity ? Number(layerOpacity) : null,
    blurStd: blurStd ? Number(blurStd) : null,
    orbR: orbR ?? null,
    midStop: stops[1] ?? null,
    outerStop: stops[2] ?? null,
    washColor: rects[1]?.[1]?.toUpperCase() ?? null,
    washAlpha: rects[1]?.[2] ? Number(rects[1][2]) : null,
  };
}

describe("AuroraLayer (preview) ↔ PPTX theme-derived wash parity (dark mode)", () => {
  for (const brand of BRAND_MODES) {
    it(`${brand.id}: preview wash params equal PPTX theme-derived values`, () => {
      const preview = extractPreview(renderAurora(brand));
      const exported = extractExport(decodeSvg(auroraSvgDataUrl(SEED, brand, "dark")));

      // Theme-derived expectations (single source of truth: aurora-svg.ts).
      const themeBase = auroraBaseTint(brand, "dark").toUpperCase();
      const themeLayerOpacity = auroraLayerOpacity("dark");
      const themeWash = darkGlassWash(brand);

      // 1. Preview matches theme-derived contract.
      expect(preview.base, "preview base tint").toBe(themeBase);
      expect(preview.layerOpacity, "preview layer opacity").toBe(themeLayerOpacity);
      expect(preview.blurStd, "preview blur stdDeviation").toBe(38);
      expect(preview.orbR, "preview orb radial extent").toBe("55%");
      expect(preview.midStop, "preview mid stop").toBe("22%");
      expect(preview.outerStop, "preview outer stop").toBe("50%");
      expect(preview.washColor, "preview glass wash color").toBe(themeWash.color.toUpperCase());
      expect(preview.washAlpha, "preview glass wash alpha").toBeCloseTo(themeWash.alpha, 5);

      // 2. Preview matches the exporter's serialized SVG byte-for-byte on
      //    every wash parameter — same theme feeds both.
      expect(preview.base).toBe(exported.base);
      expect(preview.layerOpacity).toBe(exported.layerOpacity);
      expect(preview.blurStd).toBe(exported.blurStd);
      expect(preview.orbR).toBe(exported.orbR);
      expect(preview.midStop).toBe(exported.midStop);
      expect(preview.outerStop).toBe(exported.outerStop);
      expect(preview.washColor).toBe(exported.washColor);
      expect(preview.washAlpha).toBeCloseTo(exported.washAlpha ?? -1, 5);
    });

    it(`${brand.id}: preview orb geometry matches auroraOrbs() spec`, () => {
      const html = renderAurora(brand);
      const orbs = auroraOrbs(SEED, brand, "dark");
      for (const o of orbs) {
        // Every orb spec must appear as an <ellipse> at the exact coords/radii
        // the shared helper produced — no rounding, no drift.
        const needle = new RegExp(
          `<ellipse cx="${o.x}" cy="${o.y}" rx="${o.rx}" ry="${o.ry}"`,
        );
        expect(html, `orb ${JSON.stringify(o)} missing from AuroraLayer`).toMatch(needle);
      }
    });
  }
});
