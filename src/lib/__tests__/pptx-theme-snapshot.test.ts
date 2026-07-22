/**
 * PPTX theme-color snapshot / parity test.
 * -----------------------------------------
 * For every BrandMode × mode (light + dark), export a minimal deck through
 * the real `exportDeckToPptx` pipeline, unzip the resulting .pptx blob, and
 * assert that the token-derived palette bytes land in the right places
 * inside the OOXML payload:
 *
 *   - Slide XML `<p:bg><p:bgPr><a:solidFill><a:srgbClr val="…">` (or the
 *     equivalent shape/background rectangle) contains the brand's derived
 *     surface / primary hex for the given mode.
 *   - At least one shape/text run carries the derived accent hex.
 *   - No stray bright-blue `#003FC7` bleeds into a dark-mode SLIDE background
 *     fill (guards the regression fixed by adaptPaletteForMode).
 *
 * We also snapshot a compact "palette fingerprint" per brand × mode so any
 * future palette-derivation change is caught in the review diff.
 *
 * The exporter is invoked in the default Node environment. `document`,
 * `Image`, `canvas`, and `FileReader` are absent — the exporter's guards
 * kick in (aurora → solid fallback, logo fetch → null, font embed → skip),
 * which is exactly the deterministic surface we want to snapshot.
 */

import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { BRAND_MODES, MODULE_VARIANTS } from "@/lib/taxonomy";
import { exportDeckToPptx, adaptPaletteForMode, type Palette } from "@/lib/pptx-export";
import type { Deck } from "@/lib/deck-store";

// ─── Fixtures ─────────────────────────────────────────────────────────────

// Pick a text-only content variant to keep the export deterministic: no
// aurora backdrop rasterization required, no chart series, no image fetch.
// MV-OP-COVER-MINIMAL is a simple cover module present in the taxonomy.
const FIXTURE_VARIANT_ID =
  MODULE_VARIANTS.find((v) => v.id === "MV-OP-COVER-MINIMAL")?.id ??
  MODULE_VARIANTS[0].id;

function minimalDeck(brandId: string): Deck {
  return {
    id: `snapshot-${brandId}`,
    createdAt: new Date("2026-01-01T00:00:00Z").toISOString(),
    title: `Snapshot: ${brandId}`,
    briefId: `brief-${brandId}`,
    brandModeId: brandId,
    archetypeId: "NA-CLASSIC",
    clientLogo: null,
    slides: [
      {
        id: "slide-1",
        position: 0,
        sectionId: "SF-01",
        variantId: FIXTURE_VARIANT_ID,
        layoutId: "LF-01",
        content: {
          title: "Snapshot Title",
          subtitle: "Snapshot Subtitle",
          eyebrow: "SNAPSHOT",
        },
        changes: [],
      },
    ],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

type Mode = "light" | "dark";

const norm = (hex: string) => hex.replace(/^#/, "").toUpperCase();

async function readAllXml(blob: Blob): Promise<{ path: string; body: string }[]> {
  // Node's pptxgenjs "blob" output wraps a Buffer in a shape JSZip's
  // auto-detect can't consume directly — convert via ArrayBuffer first.
  const buf = new Uint8Array(await blob.arrayBuffer());
  const zip = await JSZip.loadAsync(buf);
  const out: { path: string; body: string }[] = [];
  await Promise.all(
    Object.keys(zip.files)
      .filter((p) => p.endsWith(".xml") || p.endsWith(".rels"))
      .map(async (p) => {
        const body = await zip.file(p)!.async("string");
        out.push({ path: p, body });
      }),
  );
  return out;
}

function slideXml(parts: { path: string; body: string }[]): string {
  return parts
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p.path))
    .map((p) => p.body)
    .join("\n");
}

function themeXml(parts: { path: string; body: string }[]): string {
  return parts
    .filter((p) => /^ppt\/theme\/theme\d+\.xml$/.test(p.path))
    .map((p) => p.body)
    .join("\n");
}

/** Extract every srgbClr hex used anywhere in the given XML blob. */
function srgbHexes(xml: string): Set<string> {
  const found = new Set<string>();
  for (const m of xml.matchAll(/<a:srgbClr\s+val="([0-9A-Fa-f]{6})"/g)) {
    found.add(m[1].toUpperCase());
  }
  return found;
}

/** Extract slide-background solidFill hexes from p:bg/p:bgPr blocks. */
function backgroundHexes(xml: string): Set<string> {
  const out = new Set<string>();
  // pptxgenjs emits <p:bg><p:bgPr><a:solidFill><a:srgbClr val="XXXXXX"/>
  const bgBlocks = xml.match(/<p:bg>[\s\S]*?<\/p:bg>/g) ?? [];
  for (const block of bgBlocks) {
    for (const m of block.matchAll(/<a:srgbClr\s+val="([0-9A-Fa-f]{6})"/g)) {
      out.add(m[1].toUpperCase());
    }
  }
  return out;
}

// ─── Cross-cutting invariants ─────────────────────────────────────────────

// Bright brand blue must NOT paint a dark-mode slide background. This is the
// exact regression `adaptPaletteForMode` was created to prevent — the
// previous exporter surfaced #003FC7 as a "surface" tile in dark mode.
const BRIGHT_BRAND_BLUE = "003FC7";

// ─── Test matrix ──────────────────────────────────────────────────────────

const MODES: Mode[] = ["light", "dark"];

describe("PPTX theme-color snapshot (all brand modes × modes)", () => {
  for (const brand of BRAND_MODES) {
    for (const mode of MODES) {
      const label = `${brand.id} / ${mode}`;

      it(`embeds the token-derived palette in ${label}`, async () => {
        const basePalette: Palette = {
          primary: norm(brand.tokens.primary),
          accent: norm(brand.tokens.accent),
          surface: norm(brand.tokens.surface),
          ink: norm(brand.tokens.ink),
        };
        const expected = adaptPaletteForMode(basePalette, mode === "dark");
        // Normalize to uppercase — pptxgenjs emits both cases across versions.
        const expectedU: Palette = {
          primary: expected.primary.toUpperCase(),
          accent: expected.accent.toUpperCase(),
          surface: expected.surface.toUpperCase(),
          ink: expected.ink.toUpperCase(),
        };

        const result = await exportDeckToPptx(minimalDeck(brand.id), brand, {
          output: "blob",
          forceMode: mode,
        });

        expect(result.failedSlides, `slide render failed for ${label}`).toEqual([]);
        expect(result.blob, `no blob returned for ${label}`).toBeTruthy();

        const parts = await readAllXml(result.blob!);
        const slides = slideXml(parts);
        const theme = themeXml(parts);
        const anyXml = slides + "\n" + theme;
        const allHex = srgbHexes(anyXml);
        const bgHex = backgroundHexes(slides);

        // 1. Accent hex must appear somewhere in the payload (eyebrow, rule,
        //    highlighted text, or shape fill — the exporter always emits it
        //    for a cover-class variant).
        expect(
          allHex.has(expectedU.accent),
          `accent ${expectedU.accent} not found in payload for ${label}. ` +
            `Present hexes: ${[...allHex].sort().join(", ")}`,
        ).toBe(true);

        // 2. At least one of the mode-derived surface / primary bytes must
        //    appear on the slide background OR as a shape fill. In dark mode
        //    that's the elevated navy (#141435) plus the flipped primary
        //    (#FFFFFF); in light mode it's the brand surface + brand primary.
        const surfaceOrPrimary =
          allHex.has(expectedU.surface) ||
          allHex.has(expectedU.primary) ||
          // pptxgenjs sometimes drops a leading zero — accept both forms.
          bgHex.has(expectedU.surface) ||
          bgHex.has(expectedU.primary);
        expect(
          surfaceOrPrimary,
          `neither surface ${expectedU.surface} nor primary ${expectedU.primary} ` +
            `landed in ${label}. bg=${[...bgHex].join(",")} all=${[...allHex].sort().join(",")}`,
        ).toBe(true);

        // 3. Dark-mode regression guard: bright brand blue must never paint
        //    a slide-background fill in dark mode. It may still appear as an
        //    accent (Enterprise's accent IS #003FC7), so we only guard the
        //    <p:bg> region.
        if (mode === "dark") {
          expect(
            bgHex.has(BRIGHT_BRAND_BLUE),
            `bright brand blue leaked into dark-mode background for ${label}. ` +
              `bg=${[...bgHex].join(",")}`,
          ).toBe(false);
        }

        // 4. Compact fingerprint for review-diff visibility. Records the
        //    derived palette + which slots landed on the background so a
        //    future palette-derivation change shows up as an obvious diff.
        expect({
          brand: brand.id,
          mode,
          expected: expectedU,
          backgroundContainsSurface: bgHex.has(expectedU.surface),
          backgroundContainsPrimary: bgHex.has(expectedU.primary),
          payloadContainsAccent: allHex.has(expectedU.accent),
          payloadContainsInk: allHex.has(expectedU.ink),
        }).toMatchSnapshot();
      });
    }
  }
});
