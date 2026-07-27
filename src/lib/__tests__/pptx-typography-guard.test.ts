/**
 * PPTX Typography Parity Guard
 * ----------------------------
 * Prevents typography drift between the on-screen preview (src/styles.css +
 * flagship tokens) and the PPTX exporter (src/lib/pptx-export.ts) + font
 * embed (src/lib/pptx-font-embed.ts).
 *
 * Rules enforced:
 *  1. Preview `--font-sans` starts with the Geist family.
 *  2. Every `fontFace:` literal in the exporter is exactly "Geist".
 *  3. Every `fontFace` declared in the pptx-parity brand contract is "Geist".
 *  4. Font-embed metadata declares typeface="Geist".
 *  5. Font sizes used by the exporter stay inside the sanctioned display range
 *     (8–560pt — captions to oversized numeral tiles). No stray 6pt / 700pt.
 *  6. Numeric weights are never used — weight is expressed via `bold: true`
 *     only (matches Geist Regular/Bold TTFs we ship).
 *  7. `charSpacing` (letter spacing) stays inside the tracking range used by
 *     the preview eyebrow/heading tokens (0–8, matching the -4→+8 tracking
 *     memory rule after normalisation to positive pptxgenjs units).
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const PARITY_SRC = read("src/lib/pptx-parity.ts");

const EXPORTER_SRC = read("src/lib/pptx-export.ts");
const EMBED_SRC = read("src/lib/pptx-font-embed.ts");
const STYLES_SRC = read("src/styles.css");

const ALLOWED_FONT_FACES = new Set(["Geist"]);
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 560;
const MAX_CHAR_SPACING = 8;

describe("PPTX typography parity guard", () => {
  it("preview --font-sans is the Geist family", () => {
    const match = STYLES_SRC.match(/--font-sans:\s*"([^"]+)"/);
    expect(match, "expected --font-sans declaration in src/styles.css").toBeTruthy();
    expect(match![1]).toMatch(/^Geist/);
  });

  it("exporter only uses the Geist typeface", () => {
    const faces = [...EXPORTER_SRC.matchAll(/fontFace:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(faces.length).toBeGreaterThan(0);
    const bad = faces.filter((f) => !ALLOWED_FONT_FACES.has(f));
    expect(bad, `disallowed fontFace values found: ${[...new Set(bad)].join(", ")}`).toEqual([]);
  });

  it("parity contract locks Geist as the sole typeface", () => {
    // Every runtime typography clause in the parity module must be Geist /
    // hasSerif:false. We match `fontFace: "..."` (a value, not a type union).
    const clauses = [
      ...PARITY_SRC.matchAll(
        /typography:\s*\{\s*fontFace:\s*"([^"]+)",\s*hasSerif:\s*(true|false)\s*\}/g,
      ),
    ];
    expect(clauses.length).toBeGreaterThan(0);
    for (const [, face, serif] of clauses) {
      expect(face).toBe("Geist");
      expect(serif).toBe("false");
    }
  });

  it("embedded font metadata registers the Geist typeface", () => {
    expect(EMBED_SRC).toMatch(/typeface="Geist"/);
    // Regular + Bold + Italic + BoldItalic slots must be present so PowerPoint
    // never substitutes system fonts.
    expect(EMBED_SRC).toMatch(/Geist-Regular\.ttf/);
    expect(EMBED_SRC).toMatch(/Geist-Bold\.ttf/);
    expect(EMBED_SRC).toMatch(/Geist-Italic\.ttf/);
    expect(EMBED_SRC).toMatch(/Geist-BoldItalic\.ttf/);
  });

  it("all literal fontSize values stay within the sanctioned range", () => {
    const sizes = [...EXPORTER_SRC.matchAll(/fontSize:\s*(\d+)/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(0);
    const outOfRange = sizes.filter((n) => n < MIN_FONT_SIZE || n > MAX_FONT_SIZE);
    expect(
      outOfRange,
      `fontSize values outside ${MIN_FONT_SIZE}-${MAX_FONT_SIZE}pt: ${[...new Set(outOfRange)].join(", ")}`,
    ).toEqual([]);
  });

  it("does not use numeric font weights (bold is expressed as a boolean)", () => {
    // Guard against `fontWeight: 700` or `weight: 600` — we only ship Regular
    // and Bold TTFs, so a numeric weight would silently render as Regular.
    expect(EXPORTER_SRC).not.toMatch(/fontWeight\s*:/);
    expect(EXPORTER_SRC).not.toMatch(/\bweight\s*:\s*\d+/);
    // No `bold:` value may be numeric.
    const boldValues = [...EXPORTER_SRC.matchAll(/\bbold:\s*([^,}\s]+)/g)].map((m) => m[1]);
    const numeric = boldValues.filter((v) => /^-?\d+(\.\d+)?$/.test(v));
    expect(numeric, `numeric bold values: ${[...new Set(numeric)].join(", ")}`).toEqual([]);
  });

  it("letter-spacing (charSpacing) stays within the tracking budget", () => {
    // Preview tracking runs -4 → +8 per the typography memory; pptxgenjs uses
    // the same signed integer scale, so mirror the -8..+8 envelope here.
    const spacings = [...EXPORTER_SRC.matchAll(/charSpacing:\s*(-?\d+)/g)].map((m) => Number(m[1]));
    const outOfRange = spacings.filter((n) => n < -MAX_CHAR_SPACING || n > MAX_CHAR_SPACING);
    expect(
      outOfRange,
      `charSpacing values outside ±${MAX_CHAR_SPACING}: ${[...new Set(outOfRange)].join(", ")}`,
    ).toEqual([]);
  });
});
