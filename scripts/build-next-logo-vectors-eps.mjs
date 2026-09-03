// Extract the NEXT 2026 lockup geometry DIRECTLY FROM THE .eps MASTERS.
//
//   node scripts/build-next-logo-vectors-eps.mjs "/tmp/logoset/src/TP NEXT 2026 Logo Set"
//
// Why not the Illustrator .svg exports: those exports re-write the artwork as
// classed <path>/<polygon>/<rect> shapes and lose fill rules and compound-path
// structure, so counters fill in and glyph parts drop — the marks came out
// wrong on signage. Here every master is interpreted as PostScript
// (Ghostscript → PDF → pdftocairo → SVG geometry), so the outlines, compound
// paths and fill rules are exactly what the .eps master draws.

import { readdirSync, statSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const root = process.argv[2];
if (!root) {
  console.error("usage: build-next-logo-vectors-eps.mjs <logo set root>");
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

const COLOURWAY_ORDER = ["white", "white-accent", "color", "dblue"];
const work = mkdtempSync(join(tmpdir(), "eps-vec-"));

function listEps(dir) {
  let out = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith("._")) continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out = out.concat(listEps(p));
    else if (entry.toLowerCase().endsWith(".eps")) out.push(p);
  }
  return out;
}

function colourwayOf(file) {
  const n = file.toLowerCase().replace(/[_-]+/g, " ");
  if (n.includes("dblue")) return "dblue";
  if (n.includes("white color") || n.includes("white blue")) return "white-accent";
  if (n.includes("white")) return "white";
  if (n.includes("color")) return "color";
  return null;
}

function num(n) {
  return String(Math.round(Number(n) * 1000) / 1000);
}

function pctToHex(value) {
  const m = /rgb\(\s*([\d.]+)%\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/.exec(value);
  if (!m) return null;
  const hex = [1, 2, 3]
    .map((i) => Math.round((Number(m[i]) / 100) * 255).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}

function compact(d) {
  // pdftocairo writes 6-decimal absolute commands; trim to 3 decimals.
  return d
    .replace(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi, (t) => num(t))
    .replace(/\s+/g, " ")
    .trim();
}

/** Interpret one .eps master and return its geometry, or null. */
function parseEps(file, colourway) {
  const pdf = join(work, "art.pdf");
  const svgOut = join(work, "art");
  execFileSync("gs", [
    "-q",
    "-dNOPAUSE",
    "-dBATCH",
    "-dEPSCrop",
    "-dNOSAFER",
    "-sDEVICE=pdfwrite",
    `-sOutputFile=${pdf}`,
    file,
  ]);
  execFileSync("pdftocairo", ["-svg", pdf, `${svgOut}.svg`]);
  const src = readFileSync(`${svgOut}.svg`, "utf8");
  const viewBox = /viewBox="([^"]+)"/.exec(src)?.[1];
  if (!viewBox) return null;
  const [, , w, h] = viewBox.split(/\s+/).map(Number);

  // Clip paths live in <defs> and are page-sized boxes — never artwork.
  const body = src.replace(/<defs>[\s\S]*?<\/defs>/g, "");
  const paths = [];
  for (const m of body.matchAll(/<path\b([^>]*?)\/?>/g)) {
    const attrs = m[1];
    const d = /\bd="([^"]+)"/.exec(attrs)?.[1];
    if (!d) continue;
    const rawFill = /\bfill="([^"]+)"/.exec(attrs)?.[1];
    if (!rawFill || rawFill === "none") continue;
    const opacity = Number(/\bfill-opacity="([^"]+)"/.exec(attrs)?.[1] ?? 1);
    if (opacity === 0) continue;
    const hex = pctToHex(rawFill) ?? rawFill;
    // All-white masters draw the whole mark in white; keep every other
    // colourway's authored builds exactly as the master specifies.
    const fill = colourway === "white" ? "#fff" : normalise(hex, colourway);
    const rule = /\bfill-rule="evenodd"/.test(attrs) ? "evenodd" : "nonzero";
    const entry = { d: compact(d), fill };
    if (rule === "evenodd") entry.fillRule = "evenodd";
    paths.push(entry);
  }
  if (paths.length === 0) return null;
  return { w, h, paths };
}

function normalise(hex, colourway) {
  const value = (hex ?? "").trim().toLowerCase();
  if (!value) return colourway === "dblue" ? "#03002c" : "#fff";
  if (value === "#ffffff") return "#fff";
  if (value === "#000000") return colourway === "dblue" || colourway === "color" ? "#03002c" : "#fff";
  return value;
}

const out = {};
for (const [id, dirName, label] of FAMILIES) {
  const dir = join(root, dirName);
  const colourways = {};
  for (const file of listEps(dir)) {
    const colourway = colourwayOf(file);
    if (!colourway) continue;
    const rel = file.slice(root.length + 1);
    const lower = rel.toLowerCase();
    const orientation = lower.includes("stacked")
      ? "stacked"
      : lower.includes("side by side") || lower.includes("ssv1") || lower.includes("ssv2")
        ? "side"
        : null;
    if (!orientation) continue;
    let parsed;
    try {
      parsed = parseEps(file, colourway);
    } catch (error) {
      console.warn(`skip ${rel}: ${error.message}`);
      continue;
    }
    if (!parsed) continue;
    colourways[colourway] ??= { stacked: null, side: null };
    colourways[colourway][orientation] ??= { ...parsed, source: rel };
  }
  const white = colourways.white ?? { stacked: null, side: null };
  if (Object.keys(colourways).length === 0) {
    console.warn(`no lockup found for ${dirName}`);
    continue;
  }
  const ordered = {};
  for (const key of COLOURWAY_ORDER) if (colourways[key]) ordered[key] = colourways[key];
  out[id] = { label, stacked: white.stacked, side: white.side, colourways: ordered };
}

const header = `// GENERATED by scripts/build-next-logo-vectors-eps.mjs — do not hand-edit.
//
// NEXT 2026 lockup geometry for every family in the official logo set, in every
// approved colourway (all-white, white with colour chevrons, full colour, and
// dark blue where the set supplies it).
//
// Geometry is interpreted straight from the .eps masters recorded in \`source\`
// (PostScript → PDF → vector geometry), NOT from the Illustrator .svg exports:
// those exports lose fill rules and compound-path structure, which broke glyph
// counters and dropped mark parts on large-format signage.

export type NextLogoArt = {
  /** Artwork box, in the lockup's own units. */
  w: number;
  h: number;
  paths: { d: string; fill: string; fillRule?: "nonzero" | "evenodd" }[];
  /** The .eps master this geometry was interpreted from, relative to the set root. */
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
  `wrote src/lib/next-logo-vectors.ts from .eps masters — ${Object.keys(out).length} families, ` +
    `${Object.values(out).reduce((n, f) => n + Object.keys(f.colourways).length, 0)} colourway sets, ${paths} paths`,
);
