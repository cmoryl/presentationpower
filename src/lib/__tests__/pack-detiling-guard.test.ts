import { describe, expect, it } from "vitest";
import {
  STYLE_PACKS,
  minimalPackLayers,
  packLayoutLayers,
  type PackComposition,
} from "@/lib/style-packs";
import { packSignature } from "@/lib/style-pack-motifs";

/**
 * De-tiling guard.
 *
 * The alternate looks must never read as wallpaper. Every plane a pack paints
 * is checked here exactly the way SlideChrome assembles it:
 *
 *   ground   -> minimalPackLayers(pack.ground(seed))
 *   scaffold -> minimalPackLayers(packLayoutLayers(pack, comp, seed))
 *   motif    -> packSignature(pack), dropped when tiled
 *
 * A surviving layer is allowed to repeat only at micro-texture scale (paper
 * grain) or at architectural scale (>= MIN_ARCH_TILE, i.e. at most a handful
 * of repeats across a 1280px sheet). Nothing in between.
 */

const COMPS: PackComposition[] = [
  "cover",
  "statement",
  "grid",
  "editorial",
  "media",
  "data",
  "quote",
  "closing",
];

const SEEDS = ["MV-OP-COVER-MEDIA", "MV-PROOF-STATS", "MV-SOLUTION-PILLARS", "MV-CLIENT-QUOTE"];

/** Micro textures read as grain, not tiling. */
const MAX_GRAIN_TILE = 40;
/** Figurative repeats must be architectural. */
const MIN_ARCH_TILE = 300;
/** Sheet width used to reason about repeat counts. */
const SHEET = 1280;

function isTiled(layer: string): boolean {
  if (/repeating-(linear|radial)-gradient/.test(layer)) return true;
  return /\brepeat\b/.test(layer) && !/no-repeat/.test(layer);
}

/** Every explicit tile size (`... / 420px 420px`) declared on a layer. */
function tileSizes(layer: string): number[] {
  const out: number[] = [];
  const re = /\/\s*(\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(layer))) out.push(Math.min(Number(m[1]), Number(m[2])));
  return out;
}

function assertScale(layer: string, label: string) {
  if (!isTiled(layer)) return;
  const sizes = tileSizes(layer);
  expect(sizes.length, `${label}: tiled layer without an explicit tile size -> ${layer}`).toBeGreaterThan(0);
  for (const s of sizes) {
    const grain = s <= MAX_GRAIN_TILE;
    const architectural = s >= MIN_ARCH_TILE;
    expect(
      grain || architectural,
      `${label}: tile ${s}px repeats ~${Math.round(SHEET / s)}x across the sheet (wallpaper band ${MAX_GRAIN_TILE}-${MIN_ARCH_TILE}px)`,
    ).toBe(true);
  }
}

describe("style pack de-tiling", () => {
  it("covers the whole directory", () => {
    expect(STYLE_PACKS.length).toBeGreaterThanOrEqual(28);
  });

  for (const pack of STYLE_PACKS) {
    describe(pack.id, () => {
      it("ground layers are grain or architectural, never wallpaper", () => {
        for (const seed of SEEDS) {
          for (const layer of minimalPackLayers(pack.ground(seed))) {
            assertScale(layer, `${pack.id} ground/${seed}`);
          }
        }
      });

      it("layout scaffolds carry no repeating gradients", () => {
        for (const comp of COMPS) {
          for (const seed of SEEDS) {
            const layers = minimalPackLayers(packLayoutLayers(pack, comp, seed));
            for (const layer of layers) {
              expect(
                /repeating-(linear|radial)-gradient/.test(layer),
                `${pack.id} scaffold/${comp}: repeating gradient survived -> ${layer}`,
              ).toBe(false);
              assertScale(layer, `${pack.id} scaffold/${comp}`);
            }
          }
        }
      });

      it("signature motif is a single non-tiled gesture", () => {
        const sig = packSignature(pack);
        if (!sig) return;
        if (isTiled(sig.background)) return; // SlideChrome drops these entirely
        assertScale(sig.background, `${pack.id} signature`);
        expect(sig.opacity, `${pack.id} signature opacity`).toBeLessThanOrEqual(0.55);
      });
    });
  }
});
