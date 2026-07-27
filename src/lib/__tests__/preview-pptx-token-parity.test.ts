// Preview ↔ PPTX theme variable parity.
//
// The on-screen preview reads brand surface/background CSS variables
// directly from `brand.tokens.{primary,accent,surface,ink}` (see
// `VariantRenderer.tsx`, `flagship.tsx`, `primitives.tsx`). The PPTX
// exporter builds its theme palette from the exact same token block
// (`pptx-export.ts` → `adaptPaletteForMode`). If either side ever
// hardcodes a different hex, the exported deck will drift from the
// preview.
//
// This test walks EVERY BrandMode in `BRAND_MODES` and, for LIGHT mode,
// asserts the four palette channels the exporter embeds into the .pptx
// theme are byte-identical (after `#`-strip + lowercase normalization)
// to the tokens the preview consumes.
//
// It also sanity-checks that each brand's light-mode `surface` reads as
// a genuinely light color (WCAG relative luminance ≥ 0.75) so a future
// token swap can't quietly ship a dark surface as "light".

import { describe, expect, it } from "vitest";
import { BRAND_MODES } from "@/lib/taxonomy";
import { adaptPaletteForMode, type Palette } from "@/lib/pptx-export";
import { contrastRatio } from "@/lib/pptx-parity";

const SURFACE_KEYS = ["primary", "accent", "surface", "ink"] as const;

const norm = (hex: string): string => hex.replace(/^#/, "").toLowerCase();

function previewPalette(brand: (typeof BRAND_MODES)[number]): Palette {
  return {
    primary: norm(brand.tokens.primary),
    accent: norm(brand.tokens.accent),
    surface: norm(brand.tokens.surface),
    ink: norm(brand.tokens.ink),
  };
}

function relLuminance(hex: string): number {
  const h = norm(hex).padStart(6, "0");
  const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

describe("preview ↔ PPTX theme variable parity (light mode)", () => {
  it("every brand has a non-empty light-mode token set", () => {
    const missing: string[] = [];
    for (const brand of BRAND_MODES) {
      for (const key of SURFACE_KEYS) {
        const v = brand.tokens[key];
        if (!v || !/^#?[0-9a-f]{6}$/i.test(v)) {
          missing.push(`${brand.id}.tokens.${key} = ${JSON.stringify(v)}`);
        }
      }
    }
    expect(missing, `Brands with missing/invalid tokens:\n${missing.join("\n")}`).toEqual([]);
  });

  it("light-mode PPTX theme palette matches the preview token block byte-for-byte", () => {
    const drift: string[] = [];
    for (const brand of BRAND_MODES) {
      const preview = previewPalette(brand);
      // Exporter feeds `adaptPaletteForMode(base, isDark)`. In light mode it
      // must be a pure passthrough — this is the exact contract the .pptx
      // theme XML is built from.
      const exported = adaptPaletteForMode(preview, false);
      for (const key of SURFACE_KEYS) {
        if (preview[key].toLowerCase() !== exported[key].toLowerCase()) {
          drift.push(`${brand.id}.${key}: preview=#${preview[key]} export=#${exported[key]}`);
        }
      }
    }
    expect(
      drift,
      `Preview/export palette drift in light mode:\n${drift.join("\n")}\n\n` +
        "Every surface/background variable the preview renders must be the same hex the .pptx theme embeds.",
    ).toEqual([]);
  });

  it("light-mode surface is genuinely light (luminance ≥ 0.75) for every brand", () => {
    const offenders: string[] = [];
    for (const brand of BRAND_MODES) {
      const L = relLuminance(brand.tokens.surface);
      if (L < 0.75)
        offenders.push(`${brand.id}.surface #${norm(brand.tokens.surface)} L=${L.toFixed(3)}`);
    }
    expect(
      offenders,
      `Brand light-mode surface tokens read as dark:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("light-mode ink has WCAG AA contrast (≥ 4.5) against its own surface", () => {
    // If the preview meets AA, the .pptx MUST too — they use the same tokens.
    const offenders: string[] = [];
    for (const brand of BRAND_MODES) {
      const ratio = contrastRatio(brand.tokens.ink, brand.tokens.surface);
      if (ratio < 4.5) {
        offenders.push(
          `${brand.id}: ink #${norm(brand.tokens.ink)} on surface #${norm(brand.tokens.surface)} = ${ratio.toFixed(2)}`,
        );
      }
    }
    expect(
      offenders,
      `Light-mode ink/surface pair fails WCAG AA:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("light-mode adapter is a pure passthrough (idempotent)", () => {
    // Guardrails against someone adding a "light tweak" branch into
    // `adaptPaletteForMode` — the light path must remain the identity so
    // preview tokens and exported theme cannot diverge.
    for (const brand of BRAND_MODES) {
      const p = previewPalette(brand);
      const once = adaptPaletteForMode(p, false);
      const twice = adaptPaletteForMode(once, false);
      expect(once).toEqual(p);
      expect(twice).toEqual(p);
    }
  });
});
