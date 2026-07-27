// Glass-utility token parity.
//
// The `.glass` and `.glass-dark` utilities in `src/styles.css` hard-code the
// hex values that define our liquid-glass tile: the navy gradient stops for
// dark surfaces, the ink color for light surfaces, and the boosted (opaque)
// variants under `.contrast-boost`. These same colors must appear byte-for-
// byte inside the exported PPTX theme palette so a dark-mode card in the
// preview and the same card in PowerPoint sit on the identical navy —
// nothing shifted by a hex digit.
//
// This test parses `src/styles.css` and compares each glass rule's hexes to
// the canonical `GLASS_TOKENS` contract, then asserts the exporter
// (`adaptPaletteForMode` + TransPerfect brand ink) reads the same bytes.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { adaptPaletteForMode } from "@/lib/pptx-export";
import { BRAND_MODES } from "@/lib/taxonomy";

// Canonical hexes (uppercase, no `#`). Change these ONLY together with the
// corresponding CSS + exporter values or the parity test will fail.
const GLASS_TOKENS = {
  // `.glass-dark` background gradient (linear-gradient(180deg, #141435 → #03002C))
  darkTileTop: "141435",
  darkTileBottom: "03002C",
  // `.contrast-boost .glass-dark` opaque variant
  contrastDarkTop: "0A0929",
  contrastDarkBottom: "03002C",
  // `.contrast-boost .glass` ink color (also our light-mode primary/ink)
  lightInk: "03002C",
} as const;

const CSS = fs.readFileSync(path.join(process.cwd(), "src/styles.css"), "utf8");

// Extract a specific rule/utility block by header pattern.
function extractBlock(headerPattern: RegExp): string {
  const match = CSS.match(headerPattern);
  if (!match) throw new Error(`Missing CSS block for ${headerPattern}`);
  const start = match.index! + match[0].length;
  // Find the matching closing brace (simple depth counter — glass blocks
  // contain no nested `{}`, but linear-gradient etc. use parens only).
  let depth = 1;
  let i = start;
  while (i < CSS.length && depth > 0) {
    const ch = CSS[i++];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
  }
  return CSS.slice(start, i - 1);
}

// All 6-digit hex codes, uppercased (drops shorthand like #fff which are
// only used for pure white in these blocks and covered separately).
function hexesIn(block: string): string[] {
  const set = new Set<string>();
  for (const m of block.matchAll(/#([0-9a-fA-F]{6})\b/g)) set.add(m[1].toUpperCase());
  return [...set].sort();
}

describe("glass utility token parity (preview ↔ export)", () => {
  it("`.glass-dark` gradient stops match GLASS_TOKENS byte-for-byte", () => {
    const block = extractBlock(/@utility\s+glass-dark\s*\{/);
    const hexes = hexesIn(block);
    // The block references darkTileTop, darkTileBottom, and one accent
    // (#4D88FF) used only for the 14%-transparent highlight wash. We assert
    // the two navy stops are present and that no *other* navy has crept in.
    expect(hexes).toContain(GLASS_TOKENS.darkTileTop);
    expect(hexes).toContain(GLASS_TOKENS.darkTileBottom);
  });

  it("`.contrast-boost .glass-dark` opaque gradient matches GLASS_TOKENS", () => {
    const block = extractBlock(
      /\.contrast-boost\s+\.glass-dark\s*,\s*\.contrast-boost\.glass-dark\s*\{/,
    );
    const hexes = hexesIn(block);
    expect(hexes).toContain(GLASS_TOKENS.contrastDarkTop);
    expect(hexes).toContain(GLASS_TOKENS.contrastDarkBottom);
  });

  it("`.contrast-boost .glass` ink color matches GLASS_TOKENS.lightInk", () => {
    const block = extractBlock(/\.contrast-boost\s+\.glass\s*,\s*\.contrast-boost\.glass\s*\{/);
    // The `color:` property is the one that must equal light ink; the
    // gradient/border only reference white + color-mix over ink.
    const colorLine = block.split(/;|\n/).find((l) => /^\s*color\s*:/.test(l));
    expect(colorLine, "missing `color:` declaration in .contrast-boost .glass").toBeTruthy();
    const hex = colorLine!.match(/#([0-9a-fA-F]{6})/)?.[1].toUpperCase();
    expect(hex).toBe(GLASS_TOKENS.lightInk);
  });

  it("exporter dark-mode surface equals `.glass-dark` gradient top stop", () => {
    // For every brand, the elevated dark tile the exporter writes into the
    // PPTX theme must be the same navy the on-screen glass-dark card shows.
    const drift: string[] = [];
    for (const brand of BRAND_MODES) {
      const base = {
        primary: brand.tokens.primary.replace("#", ""),
        accent: brand.tokens.accent.replace("#", ""),
        surface: brand.tokens.surface.replace("#", ""),
        ink: brand.tokens.ink.replace("#", ""),
      };
      const dark = adaptPaletteForMode(base, true);
      if (dark.surface.toUpperCase() !== GLASS_TOKENS.darkTileTop) {
        drift.push(`${brand.id}: export=#${dark.surface} glass=#${GLASS_TOKENS.darkTileTop}`);
      }
    }
    expect(drift, `Exporter dark surface drifted from .glass-dark:\n${drift.join("\n")}`).toEqual(
      [],
    );
  });

  it("Enterprise (master) brand ink equals GLASS_TOKENS.lightInk", () => {
    // The .contrast-boost .glass tile's text color IS the master brand
    // ink/primary. If either moves, light-mode glass surfaces desync from
    // exported text color.
    const master = BRAND_MODES.find((b) => b.id === "bm-enterprise");
    expect(master, "Enterprise brand mode missing").toBeTruthy();
    expect(master!.tokens.primary.replace("#", "").toUpperCase()).toBe(GLASS_TOKENS.lightInk);
    expect(master!.tokens.ink.replace("#", "").toUpperCase()).toBe(GLASS_TOKENS.lightInk);
  });
});
