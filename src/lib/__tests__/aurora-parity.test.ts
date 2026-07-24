// Automated regression: the aurora backdrop painted by the on-screen
// AuroraLayer must be byte-equivalent to what auroraSvgDataUrl embeds into
// PPTX/PDF exports. Both call sites share auroraOrbs() from aurora-svg.ts,
// so this test locks the shared math AND the SVG serialization together —
// any drift in orb geometry, palette, opacity or vignette breaks the build
// before a wrong-looking export ships.

import { describe, it, expect } from "vitest";
import {
  auroraOrbs,
  auroraSvgDataUrl,
  auroraBaseTint,
  auroraLayerOpacity,
} from "../aurora-svg";
import { MODULE_VARIANTS } from "../taxonomy";

// Minimal BrandMode fixtures covering every division token used across the app.
const brands = [
  { name: "corporate", tokens: { primary: "#003FC7", accent: "#003FC7", surface: "#FFFFFF" } },
  { name: "life-sciences", tokens: { primary: "#0A2540", accent: "#00A896", surface: "#F5FBF9" } },
  { name: "legal", tokens: { primary: "#1A1A1A", accent: "#C9A46A", surface: "#FAF7F1" } },
  { name: "media-tech", tokens: { primary: "#0B1330", accent: "#EC388A", surface: "#FFF7FB" } },
  { name: "regional", tokens: { primary: "#03002C", accent: "#A1FBF9", surface: "#EEFCFC" } },
  { name: "trial-interactive", tokens: { primary: "#0A2540", accent: "#A6FA87", surface: "#F4FBEE" } },
] as const;

function decodeSvg(dataUrl: string): string {
  expect(dataUrl.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
  return decodeURIComponent(dataUrl.replace("data:image/svg+xml;charset=utf-8,", ""));
}

describe("aurora parity: on-screen renderer ↔ PPTX export", () => {
  it("embeds every orb's color/position/size/alpha from auroraOrbs() into the exported SVG", () => {
    for (const brand of brands) {
      for (const mode of ["dark", "light"] as const) {
        const seed = `${brand.name}-cover`;
        const orbs = auroraOrbs(seed, brand as any, mode);
        const svg = decodeSvg(auroraSvgDataUrl(seed, brand as any, mode));

        expect(orbs).toHaveLength(3);
        orbs.forEach((o, i) => {
          // Gradient stop uses the exact orb color + alpha
          expect(svg).toContain(`id="orb-${i}"`);
          expect(svg).toContain(`stop-color="${o.color}" stop-opacity="${o.alpha}"`);
          // Ellipse uses the exact cx/cy/rx/ry the renderer would paint
          expect(svg).toContain(
            `<ellipse cx="${o.x}" cy="${o.y}" rx="${o.rx}" ry="${o.ry}" fill="url(#orb-${i})" />`,
          );
        });
      }
    }
  });

  it("bakes the same base tint and layer opacity the renderer applies", () => {
    for (const brand of brands) {
      for (const mode of ["dark", "light"] as const) {
        const seed = `${brand.name}-hero`;
        const svg = decodeSvg(auroraSvgDataUrl(seed, brand as any, mode));
        const base = auroraBaseTint(brand as any, mode);
        const op = auroraLayerOpacity(mode);
        expect(svg).toContain(`<rect width="1280" height="720" fill="${base}" />`);
        expect(svg).toContain(`opacity="${op}"`);
      }
    }
  });

  it("uses the mode-specific blur radius and orb radius that AuroraLayer paints (free-form v2 — no vignette, no wash)", () => {
    const dark = decodeSvg(auroraSvgDataUrl("x", brands[0] as any, "dark"));
    const light = decodeSvg(auroraSvgDataUrl("x", brands[0] as any, "light"));
    expect(dark).toContain('stdDeviation="55"');
    expect(dark).toContain('r="90%"'); // orb radial gradient reach
    // Light-mode blur was raised to 125px so accent orbs feather into the
    // background without competing with content ink.
    expect(light).toContain('stdDeviation="125"');
    expect(light).toContain('r="95%"');
    // v2 rebuild drops both the frosted-glass wash and the edge vignette so
    // content sits directly on the accent blooms (matches reference decks).
    expect(dark).not.toContain('id="vignette"');
    expect(light).not.toContain('id="vignette"');
    // Only one full-bleed rect (the base tint) — no wash rect on top.
    expect(dark.match(/<rect width="1280" height="720"/g)?.length ?? 0).toBe(1);
    expect(light.match(/<rect width="1280" height="720"/g)?.length ?? 0).toBe(1);
  });

  it("is deterministic: identical (seed, brand, mode) → identical SVG payload", () => {
    for (const brand of brands) {
      for (const mode of ["dark", "light"] as const) {
        const a = auroraSvgDataUrl("deck-42", brand as any, mode);
        const b = auroraSvgDataUrl("deck-42", brand as any, mode);
        expect(a).toBe(b);
      }
    }
  });

  it("covers every module variant with a valid dark-mode backdrop (no NaN, no missing orbs)", () => {
    const brand = brands[0];
    for (const variant of MODULE_VARIANTS.slice(0, 40)) {
      const orbs = auroraOrbs(variant.id, brand as any, "dark");
      expect(orbs).toHaveLength(3);
      for (const o of orbs) {
        expect(Number.isFinite(o.x) && Number.isFinite(o.y)).toBe(true);
        expect(o.rx).toBeGreaterThan(0);
        expect(o.ry).toBeGreaterThan(0);
        expect(o.alpha).toBeGreaterThan(0);
        expect(o.alpha).toBeLessThanOrEqual(1);
        expect(o.color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
});
