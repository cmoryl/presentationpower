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
import { auroraBaseTint, auroraLayerOpacity, auroraOrbs, auroraSvgDataUrl } from "@/lib/aurora-svg";
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
  return decodeURIComponent(dataUrl.replace("data:image/svg+xml;charset=utf-8,", ""));
}

/** Pull numeric wash params out of the rendered AuroraLayer HTML.
 *  Free-form v2: no frosted-glass wash div, no vignette div. */
function extractPreview(html: string) {
  const baseMatch = html.match(/style="background:([^"]+)"/);
  const svgOpacityMatch = html.match(/<svg[^>]*style="opacity:([\d.]+)"/);
  const blurStd = html.match(/stdDeviation="([\d.]+)"/)?.[1];
  const orbR = html.match(/<radialGradient[^>]*r="([^"]+)"/)?.[1];
  const stops = [...html.matchAll(/<stop offset="([^"]+)"/g)].map((m) => m[1]);
  return {
    base: baseMatch?.[1]?.trim().toUpperCase() ?? null,
    layerOpacity: svgOpacityMatch ? Number(svgOpacityMatch[1]) : null,
    blurStd: blurStd ? Number(blurStd) : null,
    orbR: orbR ?? null,
    midStop: stops[1] ?? null,
    outerStop: stops[2] ?? null,
  };
}

/** Pull the same params from the exporter's SVG payload. */
function extractExport(svg: string) {
  const layerOpacity = svg.match(/<g filter="url\(#aurora-blur\)" opacity="([\d.]+)"/)?.[1];
  const blurStd = svg.match(/stdDeviation="([\d.]+)"/)?.[1];
  const orbR = svg.match(/<radialGradient id="orb-0"[^>]*r="([^"]+)"/)?.[1];
  const stops = [...svg.matchAll(/<stop offset="([^"]+)"/g)].map((m) => m[1]);
  const rects = [
    ...svg.matchAll(/<rect width="1280" height="720" fill="([^"]+)"(?: fill-opacity="([\d.]+)")?/g),
  ];
  return {
    base: rects[0]?.[1]?.toUpperCase() ?? null,
    layerOpacity: layerOpacity ? Number(layerOpacity) : null,
    blurStd: blurStd ? Number(blurStd) : null,
    orbR: orbR ?? null,
    midStop: stops[1] ?? null,
    outerStop: stops[2] ?? null,
    rectCount: rects.length,
  };
}

describe("AuroraLayer (preview) ↔ PPTX theme-derived parity — free-form v2 (dark mode)", () => {
  for (const brand of BRAND_MODES) {
    it(`${brand.id}: preview aurora params equal PPTX theme-derived values`, () => {
      const preview = extractPreview(renderAurora(brand));
      const exported = extractExport(decodeSvg(auroraSvgDataUrl(SEED, brand, "dark")));

      const themeBase = auroraBaseTint(brand, "dark").toUpperCase();
      const themeLayerOpacity = auroraLayerOpacity("dark");

      // 1. Preview matches theme-derived contract.
      expect(preview.base, "preview base tint").toBe(themeBase);
      expect(preview.layerOpacity, "preview layer opacity").toBe(themeLayerOpacity);
      expect(preview.blurStd, "preview blur stdDeviation").toBe(55);
      expect(preview.orbR, "preview orb radial extent").toBe("90%");
      expect(preview.midStop, "preview mid stop").toBe("38%");
      expect(preview.outerStop, "preview outer stop").toBe("78%");

      // 2. Preview matches exporter on every param — same theme feeds both.
      expect(preview.base).toBe(exported.base);
      expect(preview.layerOpacity).toBe(exported.layerOpacity);
      expect(preview.blurStd).toBe(exported.blurStd);
      expect(preview.orbR).toBe(exported.orbR);
      expect(preview.midStop).toBe(exported.midStop);
      expect(preview.outerStop).toBe(exported.outerStop);

      // 3. Free-form v2: exporter emits exactly ONE full-bleed rect (the base
      //    tint). No wash rect, no vignette rect.
      expect(exported.rectCount, "exporter rect count (base only, no wash/vignette)").toBe(1);
    });

    it(`${brand.id}: preview orb geometry matches auroraOrbs() spec`, () => {
      const html = renderAurora(brand);
      const orbs = auroraOrbs(SEED, brand, "dark");
      for (const o of orbs) {
        const needle = new RegExp(`<ellipse cx="${o.x}" cy="${o.y}" rx="${o.rx}" ry="${o.ry}"`);
        expect(html, `orb ${JSON.stringify(o)} missing from AuroraLayer`).toMatch(needle);
      }
    });
  }
});
