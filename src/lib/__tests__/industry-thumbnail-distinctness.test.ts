// Automated visual regression / snapshot guard for the R01–R30 thumbnails.
// ------------------------------------------------------------------------
// The industry gallery, template pickers and agent previews all render an
// industry background system through `set.layers(scene, take)`. Those layer
// stacks are deterministic, so we can fingerprint them and assert that each
// target thumbnail stays *clearly distinguishable* from all 29 others.
//
// Two guards run per family representative (Hero / Content / Data / Flow):
//   1. Structural fingerprint uniqueness — no two recipes render the same art.
//   2. Pairwise dissimilarity floor — token-set (Jaccard) distance between any
//      two thumbnails must exceed DISTINCT_FLOOR, so "unique but visually
//      identical" drift also fails.
// A locked snapshot of every fingerprint makes any authored change explicit.

import { describe, expect, it } from "vitest";
import {
  INDUSTRY_BG_FAMILIES,
  industryBackgroundSets,
} from "../industry-backgrounds";
import type { SkinScene } from "../skin-backgrounds";

const sets = industryBackgroundSets();

/** Minimum token-set distance (0 = identical, 1 = disjoint) between thumbnails. */
const DISTINCT_FLOOR = 0.2;

/** Decode any inline SVG payloads so authored scene geometry is fingerprinted too. */
function expandLayers(layers: string[]): string {
  return layers
    .map((layer) =>
      layer.includes("image/svg+xml")
        ? layer.replace(/data:image\/svg\+xml[^"')]*/g, (m) => {
            try {
              return decodeURIComponent(m.replace(/^data:image\/svg\+xml[^,]*,/, ""));
            } catch {
              return m;
            }
          })
        : layer,
    )
    .join("\n");
}

/** Stable structural tokens: colors, gradient kinds, angles, stops, shapes. */
function tokenize(art: string): Set<string> {
  const tokens = new Set<string>();
  const push = (re: RegExp, prefix: string) => {
    for (const m of art.matchAll(re)) tokens.add(`${prefix}:${m[0].toLowerCase()}`);
  };
  push(/#[0-9a-f]{3,8}\b/gi, "hex");
  push(/(?:linear|radial|conic)-gradient/gi, "grad");
  push(/-?\d+(?:\.\d+)?deg/g, "angle");
  push(/\b\d{1,3}(?:\.\d+)?%/g, "stop");
  push(/<(?:rect|circle|ellipse|path|line|polygon|polyline|g|filter|mask)\b/g, "shape");
  push(/\b(?:rgba?|hsla?)\([^)]*\)/gi, "color");
  return tokens;
}

function distance(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  const union = a.size + b.size - shared;
  return union === 0 ? 0 : 1 - shared / union;
}

/** Compact, human-readable fingerprint for the snapshot baseline. */
function fingerprint(art: string) {
  const tokens = tokenize(art);
  let hash = 0x811c9dc5;
  for (const t of [...tokens].sort()) {
    for (let i = 0; i < t.length; i += 1) {
      hash ^= t.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
  }
  return {
    tokens: tokens.size,
    hues: new Set([...tokens].filter((t) => t.startsWith("hex:"))).size,
    gradients: [...tokens].filter((t) => t.startsWith("grad:")).length,
    shapes: [...tokens].filter((t) => t.startsWith("shape:")).length,
    hash: hash.toString(16).padStart(8, "0"),
  };
}

interface Thumb {
  id: string;
  scene: SkinScene;
  tokens: Set<string>;
}

function thumbsFor(scene: SkinScene): Thumb[] {
  return sets.map((s) => ({
    id: s.recipeId,
    scene,
    tokens: tokenize(expandLayers(s.layers(scene, 0))),
  }));
}

describe("R01–R30 thumbnail visual regression", () => {
  it("covers all thirty target recipes", () => {
    expect(sets).toHaveLength(30);
  });

  for (const family of INDUSTRY_BG_FAMILIES) {
    const scene = family.representative;

    it(`${family.label} thumbnails render meaningful art for every recipe`, () => {
      for (const t of thumbsFor(scene)) {
        expect(t.tokens.size, `${t.id} ${scene}`).toBeGreaterThan(8);
      }
    });

    it(`${family.label} thumbnails are structurally unique across R01–R30`, () => {
      const thumbs = thumbsFor(scene);
      const prints = thumbs.map((t) => fingerprint([...t.tokens].sort().join("|")).hash);
      expect(new Set(prints).size, `${family.label} collision`).toBe(30);
    });

    it(`${family.label} thumbnails stay clearly distinguishable (Jaccard ≥ ${DISTINCT_FLOOR})`, () => {
      const thumbs = thumbsFor(scene);
      const offenders: string[] = [];
      let worst = { pair: "", d: 1 };
      for (let i = 0; i < thumbs.length; i += 1) {
        for (let j = i + 1; j < thumbs.length; j += 1) {
          const d = distance(thumbs[i]!.tokens, thumbs[j]!.tokens);
          if (d < worst.d) worst = { pair: `${thumbs[i]!.id}↔${thumbs[j]!.id}`, d };
          if (d < DISTINCT_FLOOR) {
            offenders.push(`${thumbs[i]!.id}↔${thumbs[j]!.id} d=${d.toFixed(3)}`);
          }
        }
      }
      expect(
        offenders,
        `${family.label}: too-similar thumbnails (closest ${worst.pair} d=${worst.d.toFixed(3)})`,
      ).toEqual([]);
    });
  }

  it("locks a fingerprint snapshot for every recipe × family thumbnail", () => {
    const baseline: Record<string, ReturnType<typeof fingerprint>> = {};
    for (const s of sets) {
      for (const family of INDUSTRY_BG_FAMILIES) {
        const art = expandLayers(s.layers(family.representative, 0));
        baseline[`${s.recipeId}/${family.key}`] = fingerprint(art);
      }
    }
    expect(baseline).toMatchSnapshot();
  });
});
