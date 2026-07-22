// Full style-parity check: every (variant × brand × mode) triple.
// Preview-side and exporter-side fingerprints must diff to zero, and each
// palette must satisfy the WCAG contrast contract for tile surfaces.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BRAND_MODES, MODULE_VARIANTS } from "@/lib/taxonomy";
import {
  fingerprintRenderer,
  fingerprintExporter,
  diffFingerprints,
  contrastRatio,
  type Mode,
} from "@/lib/pptx-parity";

const MODES: Mode[] = ["light", "dark"];

describe("PPTX ↔ Preview style parity", () => {
  it("every (variant, brand, mode) fingerprint matches exporter fingerprint", () => {
    const drift: string[] = [];
    for (const variant of MODULE_VARIANTS) {
      for (const brand of BRAND_MODES) {
        for (const mode of MODES) {
          const prev = fingerprintRenderer(variant, brand, mode);
          const exp = fingerprintExporter(variant, brand, mode);
          const d = diffFingerprints(prev, exp);
          if (d.length) {
            drift.push(
              `${variant.id} · ${brand.id} · ${mode}\n` +
                d.map((x) => `    ${x.path}: preview=${JSON.stringify(x.preview)} exporter=${JSON.stringify(x.exporter)}`).join("\n"),
            );
          }
        }
      }
    }
    expect(drift, `Style drift in ${drift.length} combos:\n${drift.slice(0, 20).join("\n")}`).toEqual([]);
  });

  it("dark-mode surface passes WCAG AA against both ink and primary text", () => {
    const offenders: string[] = [];
    for (const brand of BRAND_MODES) {
      const fp = fingerprintExporter(MODULE_VARIANTS[0], brand, "dark");
      const cInk = contrastRatio(`#${fp.palette.ink}`, `#${fp.palette.surface}`);
      const cPri = contrastRatio(`#${fp.palette.primary}`, `#${fp.palette.surface}`);
      if (cInk < 4.5) offenders.push(`${brand.id}: ink vs surface = ${cInk.toFixed(2)}:1 (need ≥ 4.5)`);
      if (cPri < 4.5) offenders.push(`${brand.id}: primary vs surface = ${cPri.toFixed(2)}:1 (need ≥ 4.5)`);
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("light-mode palette exactly matches brand tokens (no silent overrides)", () => {
    const offenders: string[] = [];
    for (const brand of BRAND_MODES) {
      const fp = fingerprintExporter(MODULE_VARIANTS[0], brand, "light");
      const expected = {
        primary: brand.tokens.primary.replace(/^#/, "").toLowerCase(),
        accent: brand.tokens.accent.replace(/^#/, "").toLowerCase(),
        surface: brand.tokens.surface.replace(/^#/, "").toLowerCase(),
        ink: brand.tokens.ink.replace(/^#/, "").toLowerCase(),
      };
      for (const k of ["primary", "accent", "surface", "ink"] as const) {
        if (fp.palette[k].toLowerCase() !== expected[k]) {
          offenders.push(`${brand.id}: ${k} = #${fp.palette[k]} ≠ brand #${expected[k]}`);
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("aurora backdrops always seed off the variant id", () => {
    const offenders: string[] = [];
    for (const variant of MODULE_VARIANTS) {
      for (const brand of BRAND_MODES) {
        for (const mode of MODES) {
          const fp = fingerprintExporter(variant, brand, mode);
          if (fp.backdrop.kind === "aurora" && fp.backdrop.seed !== variant.id) {
            offenders.push(`${variant.id} · ${brand.id} · ${mode}: seed=${fp.backdrop.seed}`);
          }
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  // Typography guard: the exporter must NEVER set a serif font, otherwise
  // exports would drift from the on-screen "no serif" project rule.
  it("pptx exporter never sets a serif font family", () => {
    const src = readFileSync(resolve(__dirname, "../pptx-export.ts"), "utf8");
    const serifHits = src.match(
      /fontFace:\s*["'](?:Georgia|Times(?:\s+New\s+Roman)?|Cambria|Palatino|Garamond|Baskerville|Didot|Serif|serif)["']/gi,
    );
    expect(serifHits, `Serif fontFace found in pptx-export.ts:\n${(serifHits ?? []).join("\n")}`).toBeNull();
  });
});
