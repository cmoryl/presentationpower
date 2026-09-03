// Extract the NEXT 2026 lockup geometry from the supplied Illustrator SVG
// exports into a compact TS module — every family, both orientations, and every
// approved colourway in the official set.
//
//   node scripts/build-next-logo-vectors.mjs "/tmp/nextlogo/TP NEXT 2026 Logo Set"
//
// The SVG exports and the EPS exports in the same folders are written from the
// same Illustrator artwork, so the path data below is the EPS geometry.

import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
if (!root) {
  console.error("usage: build-next-logo-vectors.mjs <logo set root>");
  process.exit(1);
}

const FAMILIES = [
  ["transperfect", "TransPerfect", "TransPerfect"],
  ["globallink", "GlobalLink", "GlobalLink"],
  ["dataforce", "Dataforce", "DataForce"],
  ["digital", "Digital", "Digital"],
  ["experience", "Experience", "Experience"],
  ["finance", "Finance", "Finance"],
  ["games", "Games", "Games"],
  ["learn", "Learn", "Learn"],
  ["legal", "Legal", "Legal"],
  ["lifesci", "Life Sci", "Life Sciences"],
  ["media", "Media", "Media"],
  ["cityseries", "City Series", "City Series"],
];

function listSvgs(dir) {
  let out = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith("._")) continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out = out.concat(listSvgs(p));
    else if (entry.toLowerCase().endsWith(".svg")) out.push(p);
  }
  return out;
}

/**
 * Which colourway a master is, from the official file naming:
 *   "... white logo"            → white        (all-white knockout)
 *   "... white color logo"      → white-accent (white wordmark, colour chevrons)
 *   "... white_blue logo"       → white-accent
 *   "... DBlue white logo"      → dblue        (dark blue mark on light grounds)
 *   "... color logo"            → color        (full-colour master)
 */
function colourwayOf(file) {
  const n = file.toLowerCase().replace(/[_-]+/g, " ");
  if (n.includes("dblue")) return "dblue";
  if (n.includes("white color") || n.includes("white blue")) return "white-accent";
  if (n.includes("white")) return "white";
  if (n.includes("color")) return "color";
  return null;
}

function parseSvg(file, colourway) {
  const src = readFileSync(file, "utf8");
  const viewBox = /viewBox="([^"]+)"/.exec(src)?.[1];
  if (!viewBox) return null;
  const [, , wRaw, hRaw] = viewBox.split(/\s+/).map(Number);

  // class -> fill map from the <style> block.
  const fills = new Map();
  const styleBlock = /<style>([\s\S]*?)<\/style>/.exec(src)?.[1] ?? "";
  for (const rule of styleBlock.matchAll(/\.([\w-]+)\s*\{([^}]*)\}/g)) {
    const fill = /fill\s*:\s*([^;]+)/.exec(rule[2])?.[1]?.trim();
    if (fill) fills.set(rule[1], fill);
  }

  const paths = [];
  const shapes = [];
  for (const m of src.matchAll(/<path\b([^>]*?)\/?>/g)) {
    shapes.push({ attrs: m[1], d: /\bd="([^"]+)"/.exec(m[1])?.[1] });
  }
  // Illustrator writes straight-edge glyph parts as <polygon>/<polyline>/<rect>.
  for (const m of src.matchAll(/<(polygon|polyline)\b([^>]*?)\/?>/g)) {
    const pts = /\bpoints="([^"]+)"/.exec(m[2])?.[1];
    if (!pts) continue;
    const nums = pts
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    let d = "";
    for (let k = 0; k + 1 < nums.length; k += 2)
      d += `${k === 0 ? "M" : "L"}${nums[k]},${nums[k + 1]}`;
    if (m[1] === "polygon") d += "Z";
    shapes.push({ attrs: m[2], d });
  }
  for (const m of src.matchAll(/<rect\b([^>]*?)\/?>/g)) {
    const a = m[1];
    const g = (k) => Number(new RegExp(`\\b${k}="([^"]+)"`).exec(a)?.[1] ?? 0);
    const x = g("x"),
      y = g("y"),
      rw = g("width"),
      rh = g("height");
    if (!rw || !rh) continue;
    shapes.push({ attrs: a, d: `M${x},${y}L${x + rw},${y}L${x + rw},${y + rh}L${x},${y + rh}Z` });
  }
  for (const { attrs, d } of shapes) {
    if (!d) continue;
    const cls = /\bclass="([^"]+)"/.exec(attrs)?.[1];
    const explicit = /\bfill="([^"]+)"/.exec(attrs)?.[1];
    const raw = explicit ?? (cls ? fills.get(cls.trim().split(/\s+/)[0]) : undefined);
    if (raw === "none") continue;
    // The all-white masters draw every shape in the mark, so any inherited or
    // default fill resolves to white rather than Illustrator black. Every other
    // colourway keeps the authored fills exactly as the EPS master specifies.
    const fill = colourway === "white" ? "#fff" : normaliseFill(raw, colourway);
    paths.push({ d, fill });
  }
  if (paths.length === 0) return null;
  return { w: wRaw, h: hRaw, paths };
}

function normaliseFill(raw, colourway) {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) return colourway === "dblue" ? "#03002c" : "#fff";
  if (value === "#ffffff" || value === "white") return "#fff";
  if (value === "#000000" || value === "black" || value === "#000") {
    // Illustrator writes the dark-blue master's mark as registration black in
    // some exports; the approved build is Blue 800.
    return colourway === "dblue" || colourway === "color" ? "#03002c" : "#fff";
  }
  return value;
}

const COLOURWAY_ORDER = ["white", "white-accent", "color", "dblue"];

const out = {};
for (const [id, dirName, label] of FAMILIES) {
  const dir = join(root, dirName);
  const colourways = {};
  for (const file of listSvgs(dir)) {
    if (/copy\.svg$/i.test(file)) continue;
    const colourway = colourwayOf(file);
    if (!colourway) continue;
    const parsed = parseSvg(file, colourway);
    if (!parsed) continue;
    const rel = file.slice(root.length + 1);
    const record = { ...parsed, source: rel.replace(/\.svg$/i, ".eps") };
    const lower = rel.toLowerCase();
    const orientation = lower.includes("stacked")
      ? "stacked"
      : lower.includes("side by side") || lower.includes("ssv1") || lower.includes("ssv2")
        ? "side"
        : null;
    if (!orientation) continue;
    colourways[colourway] ??= { stacked: null, side: null };
    colourways[colourway][orientation] ??= record;
  }
  const white = colourways.white ?? { stacked: null, side: null };
  if (!white.stacked && !white.side && Object.keys(colourways).length === 0) {
    console.warn(`no lockup found for ${dirName}`);
    continue;
  }
  const ordered = {};
  for (const key of COLOURWAY_ORDER) if (colourways[key]) ordered[key] = colourways[key];
  out[id] = { label, stacked: white.stacked, side: white.side, colourways: ordered };
}

const header = `// GENERATED by scripts/build-next-logo-vectors.mjs — do not hand-edit.
//
// NEXT 2026 lockup geometry for every family in the official logo set, in every
// approved colourway (all-white, white with colour chevrons, full colour, and
// dark blue where the set supplies it). Path data is lifted from the Illustrator
// SVG exports, which are written from the same artwork as the .eps masters
// recorded in \`source\` — so signage SVG and .ai output carries the EPS vector
// outlines, not a traced approximation.

export type NextLogoArt = {
  /** Artwork box, in the lockup's own units. */
  w: number;
  h: number;
  paths: { d: string; fill: string }[];
  /** The .eps master this geometry came from, relative to the logo set root. */
  source: string;
};

/** Approved colourways, in presentation order. */
export const NEXT_LOGO_COLOURWAYS = ${JSON.stringify(COLOURWAY_ORDER)} as const;

export type NextLogoColourway = (typeof NEXT_LOGO_COLOURWAYS)[number];

export const NEXT_LOGO_COLOURWAY_LABELS: Record<NextLogoColourway, string> = {
  "white": "All white",
  "white-accent": "White + colour chevrons",
  "color": "Full colour",
  "dblue": "Dark blue",
};

export type NextLogoOrientationSet = {
  /** Vertical lockup — the default for signage. */
  stacked: NextLogoArt | null;
  /** Horizontal lockup — used when the panel is wider than it is tall. */
  side: NextLogoArt | null;
};

export type NextLogoFamily = NextLogoOrientationSet & {
  label: string;
  /** Every colourway the official set ships for this family. */
  colourways: Partial<Record<NextLogoColourway, NextLogoOrientationSet>>;
};

export const NEXT_LOGO_FAMILIES: Record<string, NextLogoFamily> = ${JSON.stringify(out, null, 2)};

export type NextLogoFamilyId = keyof typeof NEXT_LOGO_FAMILIES;

export function nextLogoFamily(id: string): NextLogoFamily {
  return NEXT_LOGO_FAMILIES[id] ?? NEXT_LOGO_FAMILIES["transperfect"]!;
}

/** Colourways this family actually ships, in approved order. */
export function nextLogoColourways(familyId: string): NextLogoColourway[] {
  const family = nextLogoFamily(familyId);
  return NEXT_LOGO_COLOURWAYS.filter((key) => {
    const set = family.colourways[key];
    return !!(set?.stacked || set?.side);
  });
}

/**
 * The lockup to place on a panel: stacked by default, the side-by-side lockup
 * once the available area is clearly horizontal. Colourway falls back to white
 * (then to any shipped colourway) when a family lacks the requested build.
 */
export function pickNextLogo(
  familyId: string,
  aspect: number,
  colourway: NextLogoColourway = "white",
): { art: NextLogoArt; orientation: "stacked" | "side"; colourway: NextLogoColourway } {
  const family = nextLogoFamily(familyId);
  const available = nextLogoColourways(familyId);
  const resolved: NextLogoColourway =
    available.find((key) => key === colourway) ?? available[0] ?? "white";
  const set: NextLogoOrientationSet =
    family.colourways[resolved] ?? { stacked: family.stacked, side: family.side };
  const wantSide = aspect >= 1.6;
  const first = wantSide ? set.side : set.stacked;
  const fallback = wantSide ? set.stacked : set.side;
  const art = (first ?? fallback ?? family.stacked ?? family.side)!;
  return { art, orientation: art === set.side ? "side" : "stacked", colourway: resolved };
}
`;

writeFileSync("src/lib/next-logo-vectors.ts", header);
const paths = Object.values(out).reduce(
  (n, f) =>
    n +
    Object.values(f.colourways).reduce(
      (m, set) => m + (set.stacked?.paths.length ?? 0) + (set.side?.paths.length ?? 0),
      0,
    ),
  0,
);
console.log(
  `wrote src/lib/next-logo-vectors.ts — ${Object.keys(out).length} families, ` +
    `${Object.values(out).reduce((n, f) => n + Object.keys(f.colourways).length, 0)} colourway sets, ${paths} paths`,
);
