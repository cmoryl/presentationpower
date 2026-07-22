// Light-mode text contrast + preview/export parity.
//
// Guards that for every brand in `BRAND_MODES`, the text colors the .pptx
// exporter embeds (`adaptPaletteForMode(base, false)`) are (a) identical to
// what the on-screen preview renders (`brand.tokens.*`) and (b) meet WCAG
// contrast thresholds against the surfaces they actually paint onto:
//
//   • preview slide background = white (#FFFFFF)      — see SlideChrome
//   • card / tile surface       = brand.tokens.surface — Blue White family
//
// Thresholds (WCAG 2.1):
//   • body / ink text            → AA normal ≥ 4.5
//   • primary heading text       → AA large  ≥ 3.0 (headings ≥ 24pt render)
//   • accent (eyebrow/rule)      → AA large  ≥ 3.0 (used as ≥ 18.66pt bold)
//
// Fails loudly if a brand token quietly drifts light or the exporter's
// palette adapter starts remapping the light path.

import { describe, expect, it } from "vitest";
import { BRAND_MODES } from "@/lib/taxonomy";
import { adaptPaletteForMode } from "@/lib/pptx-export";
import { contrastRatio } from "@/lib/pptx-parity";

const norm = (hex: string) => hex.replace(/^#/, "").toLowerCase();

// The two backgrounds text lands on in a light-mode slide.
const SLIDE_BG = "FFFFFF";

const AA_NORMAL = 4.5;
const AA_LARGE = 3.0;

type Pairing = {
  kind: "primary" | "ink" | "accent";
  onSlide: number; // required contrast against #FFFFFF
  onSurface: number; // required contrast against brand.tokens.surface
};

// primary is heading-tier (large), ink is body (normal), accent is
// eyebrow/rule (large, bold).
const PAIRINGS: Pairing[] = [
  { kind: "primary", onSlide: AA_LARGE, onSurface: AA_LARGE },
  { kind: "ink", onSlide: AA_NORMAL, onSurface: AA_NORMAL },
  { kind: "accent", onSlide: AA_LARGE, onSurface: AA_LARGE },
];

describe("light-mode text contrast guard (preview ↔ export)", () => {
  it("exporter light-mode text colors match the preview token block byte-for-byte", () => {
    const drift: string[] = [];
    for (const brand of BRAND_MODES) {
      const previewText = {
        primary: norm(brand.tokens.primary),
        ink: norm(brand.tokens.ink),
        accent: norm(brand.tokens.accent),
      };
      const base = {
        primary: norm(brand.tokens.primary),
        accent: norm(brand.tokens.accent),
        surface: norm(brand.tokens.surface),
        ink: norm(brand.tokens.ink),
      };
      const exported = adaptPaletteForMode(base, false);
      for (const k of ["primary", "ink", "accent"] as const) {
        if (exported[k].toLowerCase() !== previewText[k]) {
          drift.push(`${brand.id}.${k}: preview=#${previewText[k]} export=#${exported[k]}`);
        }
      }
    }
    expect(drift, `Preview/export text color drift:\n${drift.join("\n")}`).toEqual([]);
  });

  it("every brand's light-mode text meets WCAG contrast on white slide background", () => {
    const offenders: string[] = [];
    for (const brand of BRAND_MODES) {
      for (const p of PAIRINGS) {
        const hex = norm(brand.tokens[p.kind]);
        const ratio = contrastRatio(hex, SLIDE_BG);
        if (ratio < p.onSlide) {
          offenders.push(
            `${brand.id}.${p.kind} #${hex} on slide-bg #${SLIDE_BG} = ${ratio.toFixed(2)} (need ≥ ${p.onSlide})`,
          );
        }
      }
    }
    expect(
      offenders,
      `Light-mode text below threshold on slide background:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("every brand's light-mode text meets WCAG contrast on its own card surface", () => {
    const offenders: string[] = [];
    for (const brand of BRAND_MODES) {
      const surface = norm(brand.tokens.surface);
      for (const p of PAIRINGS) {
        const hex = norm(brand.tokens[p.kind]);
        const ratio = contrastRatio(hex, surface);
        if (ratio < p.onSurface) {
          offenders.push(
            `${brand.id}.${p.kind} #${hex} on surface #${surface} = ${ratio.toFixed(2)} (need ≥ ${p.onSurface})`,
          );
        }
      }
    }
    expect(
      offenders,
      `Light-mode text below threshold on card surface:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("exporter's on-slide contrast equals the preview's on-slide contrast (no drift)", () => {
    // Explicit numeric parity — even a rounding change in one path would
    // fail here before it shipped to users.
    const drift: string[] = [];
    for (const brand of BRAND_MODES) {
      const base = {
        primary: norm(brand.tokens.primary),
        accent: norm(brand.tokens.accent),
        surface: norm(brand.tokens.surface),
        ink: norm(brand.tokens.ink),
      };
      const exported = adaptPaletteForMode(base, false);
      for (const k of ["primary", "ink", "accent"] as const) {
        const previewRatio = contrastRatio(base[k], SLIDE_BG);
        const exportRatio = contrastRatio(exported[k], SLIDE_BG);
        if (Math.abs(previewRatio - exportRatio) > 1e-6) {
          drift.push(
            `${brand.id}.${k}: preview=${previewRatio.toFixed(4)} export=${exportRatio.toFixed(4)}`,
          );
        }
      }
    }
    expect(drift, `Contrast-ratio drift between preview and export:\n${drift.join("\n")}`).toEqual([]);
  });
});
