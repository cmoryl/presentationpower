/**
 * SKIN BACKGROUND LIBRARY.
 *
 * Every catalog visual language (S01–S28) gets a *preset library* of stylised
 * backdrops — one recipe per deck section (cover, agenda, statement, stat wall,
 * split media, bento, chart, quote, timeline, closing) — instead of a single
 * flat ground reused everywhere.
 *
 * Two rules keep it cohesive rather than noisy:
 *
 *  1. MOTIF FAMILY PER SKIN. The skin's own `bestFit` industry words and
 *     `imagery` direction resolve to one motif family (tech mesh, finance
 *     ledger, clinical grid, luxury foil, industrial blueprint, creative
 *     shards, civic rules, energy contours, retail arcs, editorial halftone).
 *     All ten scenes in a skin draw from that same family, so a deck reads as
 *     one designed system.
 *  2. INTENSITY CURVE PER SCENE. Covers and closings run the loudest, content
 *     sections run quiet so text and charts stay legible.
 *
 * Layers are plain CSS background layers (topmost first), so the same recipes
 * render on screen, in previews and through the raster/PPTX export path.
 */

import type { DesignSkin } from "./design-skins";

export type SkinScene =
  | "cover"
  | "agenda"
  | "statement"
  | "stats"
  | "split"
  | "bento"
  | "chart"
  | "quote"
  | "timeline"
  | "closing"
  | "section";

export const SKIN_SCENES: SkinScene[] = [
  "cover",
  "agenda",
  "statement",
  "stats",
  "split",
  "bento",
  "chart",
  "quote",
  "timeline",
  "closing",
  "section",
];

export type MotifFamily =
  | "mesh"
  | "ledger"
  | "clinical"
  | "foil"
  | "blueprint"
  | "shards"
  | "civic"
  | "contour"
  | "arcs"
  | "halftone"
  | "prism"
  | "orbit"
  | "wave"
  | "circuit"
  | "terrazzo"
  | "aurora"
  | "brutal"
  | "isotype";

export const MOTIF_LABEL: Record<MotifFamily, string> = {
  mesh: "Luminous mesh",
  ledger: "Ledger rules",
  clinical: "Clinical grid",
  foil: "Foil sweep",
  blueprint: "Blueprint plate",
  shards: "Kinetic shards",
  civic: "Civic bands",
  contour: "Contour field",
  arcs: "Concentric arcs",
  halftone: "Editorial halftone",
  prism: "Prismatic light",
  orbit: "Orbital rings",
  wave: "Tidal waves",
  circuit: "Circuit trace",
  terrazzo: "Terrazzo confetti",
  aurora: "Aurora drift",
  brutal: "Brutalist blocks",
  isotype: "Isometric lattice",
};


/* ------------------------------------------------------------------ colours */

export function rgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function mixHex(a: string, b: string, t: number): string {
  const pa = a.replace("#", "");
  const pb = b.replace("#", "");
  const ch = (i: number) => {
    const x = parseInt(pa.slice(i, i + 2), 16);
    const y = parseInt(pb.slice(i, i + 2), 16);
    return Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${ch(0)}${ch(2)}${ch(4)}`;
}

/* -------------------------------------------------------------------- motif */

/** Stable hash of a skin, used to vary geometry between same-family skins. */
export function skinSeed(skin: DesignSkin): number {
  const s = `${skin.code ?? ""}${skin.name ?? ""}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Hand-assigned motif per catalog code. Every one of the 18 families is used,
 * and no family carries more than two skins, so each visual language reads as
 * its own designed system rather than a shared wallpaper.
 */
export const SKIN_MOTIF: Record<string, MotifFamily> = {
  S01: "mesh",
  S02: "aurora",
  S03: "prism",
  S04: "circuit",
  S05: "ledger",
  S06: "clinical",
  S07: "wave",
  S08: "terrazzo",
  S09: "blueprint",
  S10: "arcs",
  S11: "arcs",
  S12: "isotype",
  S13: "mesh",
  S14: "civic",
  S15: "halftone",
  S16: "foil",
  S17: "contour",
  S18: "aurora",
  S19: "blueprint",
  S20: "ledger",
  S21: "contour",
  S22: "halftone",
  S23: "brutal",
  S24: "isotype",
  S25: "shards",
  S26: "prism",
  S27: "orbit",
  S28: "terrazzo",
};

/** Resolve the skin's industry fit + imagery note into one motif family. */
export function motifFamilyFor(skin: DesignSkin): MotifFamily {
  const mapped = SKIN_MOTIF[(skin.code ?? "").toUpperCase()];
  if (mapped) return mapped;

  const t = `${skin.bestFit} ${skin.imagery} ${skin.surfaceNote} ${skin.name}`.toLowerCase();
  const has = (re: RegExp) => re.test(t);
  if (has(/luxury|fashion|couture|jewel|beauty|premium|gallery/)) return "foil";
  if (has(/health|clinic|medical|pharma|biotech|life science|patient/)) return "clinical";
  if (has(/financ|bank|invest|insur|capital|fintech|ledger|audit/)) return "ledger";
  if (has(/manufactur|industrial|engineer|construct|architect|blueprint|aerospace/))
    return "blueprint";
  if (has(/logistic|supply|freight|network|telecom|infrastructure|iso|axonometric/))
    return "isotype";
  if (has(/semiconduct|hardware|robotic|cyber|security|devops|circuit|chip/)) return "circuit";
  if (has(/ai|machine learning|data platform|analytics|quantum|neural/)) return "aurora";
  if (has(/glass|iridescen|prism|spectrum|holograph|refract|light/)) return "prism";
  if (has(/space|research|science|lab|orbit|satellite|astro/)) return "orbit";
  if (has(/marine|ocean|water|fluid|wellness|calm|spa|travel|tourism|hospitality/)) return "wave";
  if (has(/playful|confetti|pop|festival|community|culture|craft|food|beverage/))
    return "terrazzo";
  if (has(/bold|swiss|brutal|poster|type-led|editorial statement|architecture studio/))
    return "brutal";
  if (has(/creative|agency|brand|entertain|sport|kinetic|expressive|music|game/)) return "shards";
  if (has(/public|government|civic|education|nonprofit|policy|university/)) return "civic";
  if (has(/energy|sustain|climate|environment|agri|utilit|topograph|terrain/)) return "contour";
  if (has(/retail|consumer|commerce|marketplace/)) return "arcs";
  if (has(/editorial|documentary|press|journal|publish|media|paper|print/)) return "halftone";
  const fallbacks: MotifFamily[] = ["mesh", "prism", "aurora", "orbit", "wave", "terrazzo"];
  return fallbacks[skinSeed(skin) % fallbacks.length]!;
}


/* --------------------------------------------------------------- primitives */

const wash = (at: string, hex: string, a: number, w = 70, h = 70) =>
  `radial-gradient(${w}% ${h}% at ${at}, ${rgba(hex, a)} 0%, ${rgba(hex, 0)} 72%)`;

const sweep = (deg: number, hex: string, a: number) =>
  `linear-gradient(${deg}deg, ${rgba(hex, a)} 0%, ${rgba(hex, 0)} 58%)`;

const rules = (hex: string, a: number, gap: number, deg = 90) =>
  `repeating-linear-gradient(${deg}deg, ${rgba(hex, a)} 0px, ${rgba(hex, a)} 1px, transparent 1px, transparent ${gap}px)`;

const dots = (hex: string, a: number, gap: number, r = 1.4) =>
  `radial-gradient(${rgba(hex, a)} ${r}px, transparent ${r + 0.6}px) 0 0 / ${gap}px ${gap}px`;

const rings = (at: string, hex: string, a: number, gap: number) =>
  `repeating-radial-gradient(circle at ${at}, ${rgba(hex, a)} 0px, ${rgba(hex, a)} 1px, transparent 1px, transparent ${gap}px)`;

const shard = (at: string, hex: string, a: number, w: string, h: string, deg = 22) =>
  `linear-gradient(${deg}deg, ${rgba(hex, a)}, ${rgba(hex, 0)}) ${at} / ${w} ${h} no-repeat`;

const band = (at: string, hex: string, a: number, w: string, h: string) =>
  `linear-gradient(${rgba(hex, a)}, ${rgba(hex, a)}) ${at} / ${w} ${h} no-repeat`;

const vignette = (hex: string, a: number) =>
  `radial-gradient(120% 90% at 50% 42%, ${rgba(hex, 0)} 42%, ${rgba(hex, a)} 100%)`;

/** Soft off-centre blob — organic, aurora-style light. */
const blob = (at: string, hex: string, a: number, w = 62, h = 48) =>
  `radial-gradient(${w}% ${h}% at ${at}, ${rgba(hex, a)} 0%, ${rgba(hex, a * 0.42)} 38%, ${rgba(hex, 0)} 76%)`;

/** Prismatic fan of hues from one point. */
const fan = (at: string, hexA: string, hexB: string, a: number, from = 12) =>
  `conic-gradient(from ${from}deg at ${at}, ${rgba(hexA, a)} 0turn, ${rgba(hexB, a * 0.7)} 0.18turn, ${rgba(hexA, 0)} 0.36turn, ${rgba(hexB, a * 0.55)} 0.62turn, ${rgba(hexA, a * 0.8)} 1turn)`;

/** Diagonal candy stripes. */
const stripes = (hex: string, a: number, gap: number, deg = 45, thick = 6) =>
  `repeating-linear-gradient(${deg}deg, ${rgba(hex, a)} 0px, ${rgba(hex, a)} ${thick}px, transparent ${thick}px, transparent ${gap}px)`;

/** Sine-like tidal bands stacked from one edge. */
const tide = (hex: string, a: number, at: string, w: string, h: string) =>
  `radial-gradient(100% 100% at ${at}, ${rgba(hex, a)} 0%, ${rgba(hex, a * 0.5)} 45%, ${rgba(hex, 0)} 70%) ${at} / ${w} ${h} no-repeat`;

/** Confetti scatter (terrazzo chips) at pseudo-random offsets. */
const confetti = (hex: string, a: number, gap: number, r = 3, offset = 0) =>
  `radial-gradient(circle at ${20 + offset}% ${30 + offset}%, ${rgba(hex, a)} ${r}px, transparent ${r + 1}px) 0 0 / ${gap}px ${gap}px`;

/** Circuit-style right-angle traces. */
const trace = (hex: string, a: number, gap: number) =>
  `linear-gradient(90deg, ${rgba(hex, a)} 1px, transparent 1px) 0 0 / ${gap}px ${gap}px, linear-gradient(0deg, ${rgba(hex, a)} 1px, transparent 1px) 0 0 / ${gap}px ${gap}px`;

/** Isometric lattice: three interlocking rule sets. */
const isoGrid = (hex: string, a: number, gap: number) =>
  `${rules(hex, a, gap, 60)}, ${rules(hex, a, gap, 120)}, ${rules(hex, a, gap * 2, 0)}`;

/* ------------------------------------------------- painterly art primitives */
// These carry the "designed" half of a backdrop: sculpted light, feathered
// sheets, single rings and duotone grading. Structure primitives (rules, dots,
// traces) now only ever appear *under* one of these, never alone.

/** Multi-stop light field — a hand-placed mesh gradient, not a flat wash. */
const meshField = (
  hexA: string,
  hexB: string,
  hexC: string,
  a: number,
  flip: boolean,
): string[] => [
  blob(flip ? "76% 18%" : "22% 16%", hexA, a, 74, 62),
  blob(flip ? "16% 72%" : "84% 66%", hexB, a * 0.82, 66, 58),
  blob("50% 112%", hexC, a * 0.6, 118, 62),
];

/** Liquid caustic light — overlapping soft lenses, as in poured glass. */
const caustic = (at: string, hexA: string, hexB: string, a: number): string[] => [
  `conic-gradient(from 210deg at ${at}, ${rgba(hexA, a)} 0turn, ${rgba(hexB, 0)} 0.22turn, ${rgba(hexB, a * 0.7)} 0.5turn, ${rgba(hexA, 0)} 0.74turn, ${rgba(hexA, a * 0.5)} 1turn)`,
  blob(at, hexB, a * 0.6, 58, 48),
];

/** Feathered angled sheet — a sculpted plane of colour with soft both edges. */
const blade = (
  at: string,
  hex: string,
  a: number,
  w: string,
  h: string,
  deg = 24,
): string =>
  `linear-gradient(${deg}deg, ${rgba(hex, 0)} 0%, ${rgba(hex, a)} 34%, ${rgba(hex, a * 0.9)} 62%, ${rgba(hex, 0)} 100%) ${at} / ${w} ${h} no-repeat`;

/** One deliberate ring — jewellery, not wallpaper. */
const halo = (at: string, hex: string, a: number, radius: number, thick = 2): string =>
  `radial-gradient(circle at ${at}, ${rgba(hex, 0)} 0 ${radius - 6}px, ${rgba(hex, a)} ${radius}px, ${rgba(hex, a)} ${radius + thick}px, ${rgba(hex, 0)} ${radius + thick + 10}px)`;

/** Soft directional grade — gives every sheet photographic depth. */
const grade = (deg: number, hexA: string, hexB: string, a: number): string =>
  `linear-gradient(${deg}deg, ${rgba(hexA, a)} 0%, ${rgba(hexA, 0)} 46%, ${rgba(hexB, a * 0.7)} 100%)`;

/** Frosted glass pane with a lit leading edge. */
const glassPane = (at: string, hex: string, a: number, w: string, h: string): string[] => [
  `linear-gradient(135deg, ${rgba(hex, a * 0.9)} 0%, ${rgba(hex, a * 0.2)} 46%, ${rgba(hex, a * 0.5)} 100%) ${at} / ${w} ${h} no-repeat`,
  `linear-gradient(${rgba(hex, a * 1.4)}, ${rgba(hex, 0)}) ${at} / ${w} 1px no-repeat`,
];

/** Tight spotlight core with long falloff — stagecraft lighting. */
const spot = (at: string, hex: string, a: number, size = 54): string =>
  `radial-gradient(${size}% ${size * 0.82}% at ${at}, ${rgba(hex, a)} 0%, ${rgba(hex, a * 0.34)} 30%, ${rgba(hex, 0)} 68%)`;



/* ---------------------------------------------------------------- intensity */

/** Loudness per scene: covers/closings sing, content sections stay calm. */
const SCENE_GAIN: Record<SkinScene, number> = {
  cover: 1,
  closing: 0.92,
  statement: 0.8,
  quote: 0.7,
  split: 0.62,
  bento: 0.58,
  stats: 0.5,
  timeline: 0.5,
  agenda: 0.45,
  chart: 0.34,
  section: 0.55,
};

/** Anchor point per scene so consecutive slides don't look identical. */
const SCENE_ANCHOR: Record<SkinScene, string> = {
  cover: "18% 14%",
  agenda: "88% 12%",
  statement: "50% 8%",
  stats: "12% 86%",
  split: "82% 74%",
  bento: "8% 12%",
  chart: "92% 88%",
  quote: "50% 92%",
  timeline: "6% 50%",
  closing: "78% 22%",
  section: "76% 14%",
};

export interface SkinBgRoles {
  surface: string;
  ink: string;
  accent: string;
  accentAlt: string;
  dark: boolean;
}

/**
 * Build the layered backdrop for one skin + one deck section.
 * Topmost layer first, page field last — matching CSS `background` order.
 */
export function skinBackgroundLayers(
  skin: DesignSkin,
  scene: SkinScene,
  r: SkinBgRoles,
): string[] {
  const family = motifFamilyFor(skin);
  const g = SCENE_GAIN[scene] ?? 0.55;
  const seed = skinSeed(skin);
  const v = seed % 4; // per-skin geometry variant
  const flip = (seed >> 3) % 2 === 1;
  const gapK = 0.78 + ((seed >> 5) % 5) * 0.14; // 0.78 – 1.34
  const rot = ((seed >> 7) % 7) * 9 - 27; // -27 – +27 deg
  const baseAnchor = SCENE_ANCHOR[scene] ?? "76% 14%";
  const anchor = flip
    ? baseAnchor
        .split(" ")
        .map((p, i) => (i === 0 ? `${100 - parseFloat(p)}%` : p))
        .join(" ")
    : baseAnchor;
  const dark = r.dark;
  // Pale accents on a pale field (or near-black on near-black) need more alpha
  // to read at all; high-contrast accents need less so they don't shout.
  const lum = (hex: string) => {
    const h = hex.replace("#", "");
    return (
      (0.2126 * parseInt(h.slice(0, 2), 16) +
        0.7152 * parseInt(h.slice(2, 4), 16) +
        0.0722 * parseInt(h.slice(4, 6), 16)) /
      255
    );
  };
  const contrast = Math.max(
    Math.abs(lum(r.accent) - lum(r.surface)),
    Math.abs(lum(r.accentAlt) - lum(r.surface)),
  );
  const punch = Math.min(2.4, Math.max(1, 0.34 / Math.max(0.06, contrast)));
  const a = (base: number) => Math.min(0.66, base * g * punch * (dark ? 1.5 : 1));
  const line = (base: number) =>
    Math.min(0.24, base * (0.55 + g * 0.6) * Math.min(punch, 1.8) * (dark ? 1.4 : 1));

  const gap = (n: number) => Math.max(8, Math.round(n * gapK));
  const tint = mixHex(r.accent, r.accentAlt, 0.5);
  const L: string[] = [];
  const wide = scene === "cover" || scene === "closing" || scene === "statement";

  switch (family) {
    case "mesh": {
      L.push(blob(anchor, r.accent, a(0.3), wide ? 86 : 60, wide ? 74 : 52));
      L.push(blob(flip ? "14% 84%" : "86% 82%", r.accentAlt, a(0.24), 72, 62));
      if (wide) L.push(sweep(150 + rot, tint, a(0.14)));
      if (g > 0.5) L.push(dots(r.ink, line(0.05), gap(26), 1));
      break;
    }
    case "ledger": {
      L.push(rules(r.ink, line(0.07), gap(64), 0));
      if (v % 2 === 0) L.push(rules(r.ink, line(0.04), gap(160), 90));
      L.push(band(scene === "chart" ? "left bottom" : "left top", r.accent, a(0.5), "100%", "3px"));
      L.push(wash(anchor, r.accent, a(0.16), 74, 70));
      if (wide) L.push(sweep(90, r.accentAlt, a(0.12)));
      break;
    }
    case "clinical": {
      L.push(rules(r.ink, line(0.055), gap(44)));
      L.push(rules(r.ink, line(0.055), gap(44), 0));
      L.push(wash(anchor, r.accent, a(0.2), 80, 76));
      if (wide) L.push(rings(flip ? "8% 8%" : "50% 4%", r.accentAlt, line(0.07), gap(34)));
      break;
    }
    case "foil": {
      L.push(fan(anchor, r.accent, r.accentAlt, a(0.22), 12 + rot));
      L.push(sweep(115 + rot, r.accent, a(0.26)));
      L.push(band("left top", r.accentAlt, a(0.55), "100%", "1px"));
      L.push(vignette(dark ? "#000000" : r.ink, dark ? 0.4 * g : 0.08 * g));
      break;
    }
    case "blueprint": {
      L.push(rules(r.accent, line(0.09), gap(96)));
      L.push(rules(r.accent, line(0.09), gap(96), 0));
      L.push(rules(r.ink, line(0.05), gap(24)));
      L.push(wash(anchor, r.accent, a(0.16), 76, 72));
      if (wide) L.push(band(flip ? "left top" : "right top", r.accent, a(0.42), "6px", "46%"));
      break;
    }
    case "shards": {
      L.push(shard(flip ? "right top" : "left top", r.accent, a(0.36), "52%", "64%", 24 + rot));
      L.push(shard("right bottom", r.accentAlt, a(0.3), "44%", "50%", -18 + rot));
      if (g > 0.55) L.push(band("left bottom", tint, a(0.5), "100%", "6px"));
      L.push(wash("50% 50%", r.accent, a(0.1), 96, 96));
      break;
    }
    case "civic": {
      L.push(band("left top", r.accent, a(0.45), "100%", wide ? "16%" : "6px"));
      L.push(band("left bottom", r.accentAlt, a(0.35), "100%", wide ? "6%" : "3px"));
      L.push(rules(r.ink, line(0.05), gap(72), 0));
      L.push(wash(anchor, r.accent, a(0.14), 72, 70));
      break;
    }
    case "contour": {
      L.push(rings(anchor, r.accent, line(0.11), gap(wide ? 26 : 34)));
      L.push(rings(flip ? "88% 88%" : "12% 92%", r.accentAlt, line(0.07), gap(46)));
      L.push(blob(anchor, r.accent, a(0.18), 92, 84));
      break;
    }
    case "arcs": {
      L.push(blob(anchor, r.accent, a(0.3), 64, 60));
      L.push(rings(flip ? "0% 100%" : "100% 100%", r.accentAlt, line(0.09), gap(wide ? 40 : 56)));
      if (wide) L.push(sweep(60 + rot, r.accentAlt, a(0.12)));
      break;
    }
    case "halftone": {
      L.push(dots(r.ink, line(0.09), gap(wide ? 12 : 18), 1.5));
      L.push(band("left top", r.ink, a(0.6), "100%", "2px"));
      L.push(wash(anchor, r.accent, a(0.18), 78, 74));
      break;
    }
    case "prism": {
      L.push(fan(anchor, r.accent, r.accentAlt, a(0.26), 24 + rot));
      L.push(shard(flip ? "left top" : "right top", r.accentAlt, a(0.24), "38%", "100%", 68));
      if (g > 0.5) L.push(rules(r.ink, line(0.04), gap(120), 68));
      L.push(blob("50% 108%", tint, a(0.16), 110, 60));
      break;
    }
    case "orbit": {
      L.push(rings(flip ? "18% 108%" : "84% -8%", r.accent, line(0.1), gap(wide ? 30 : 44)));
      L.push(
        `radial-gradient(circle at ${anchor}, ${rgba(r.accentAlt, a(0.32))} 0 4px, transparent 5px)`,
      );
      L.push(blob(anchor, r.accent, a(0.2), 78, 70));
      if (g > 0.6) L.push(dots(r.ink, line(0.045), gap(40), 1));
      break;
    }
    case "wave": {
      L.push(tide(r.accent, a(0.28), flip ? "right bottom" : "left bottom", "130%", "62%"));
      L.push(tide(r.accentAlt, a(0.2), flip ? "left bottom" : "right bottom", "110%", "42%"));
      L.push(blob(anchor, tint, a(0.18), 84, 62));
      break;
    }
    case "circuit": {
      L.push(trace(r.accent, line(0.09), gap(38)));
      L.push(
        `radial-gradient(circle at ${anchor}, ${rgba(r.accentAlt, a(0.4))} 0 3px, transparent 4px)`,
      );
      if (wide) L.push(band(flip ? "right top" : "left top", r.accent, a(0.4), "3px", "60%"));
      L.push(blob(flip ? "16% 82%" : "84% 78%", r.accent, a(0.2), 70, 60));
      break;
    }
    case "terrazzo": {
      L.push(confetti(r.accent, a(0.34), gap(64), 4, v * 6));
      L.push(confetti(r.accentAlt, a(0.28), gap(88), 5, 12 + v * 5));
      L.push(confetti(r.ink, line(0.12), gap(52), 2.4, 30));
      if (wide) L.push(stripes(tint, a(0.1), gap(28), 45 + rot, 8));
      break;
    }
    case "aurora": {
      L.push(blob(anchor, r.accent, a(0.34), wide ? 96 : 66, wide ? 78 : 54));
      L.push(blob(flip ? "22% 78%" : "78% 24%", r.accentAlt, a(0.28), 78, 58));
      L.push(blob("50% 104%", tint, a(0.2), 120, 56));
      if (g > 0.55) L.push(sweep(20 + rot, r.accentAlt, a(0.12)));
      break;
    }
    case "brutal": {
      L.push(band(flip ? "right top" : "left top", r.accent, a(0.5), wide ? "34%" : "12%", "100%"));
      L.push(band("left bottom", r.ink, a(0.42), "100%", wide ? "10px" : "4px"));
      if (v % 2 === 0) L.push(band("right bottom", r.accentAlt, a(0.4), "22%", "26%"));
      L.push(stripes(r.ink, line(0.08), gap(20), 45, 3));
      break;
    }
    case "isotype": {
      L.push(isoGrid(r.accent, line(0.075), gap(38)));
      L.push(blob(anchor, r.accentAlt, a(0.22), 80, 68));
      if (wide) L.push(shard(flip ? "left bottom" : "right bottom", r.accent, a(0.2), "46%", "54%", 30));
      break;
    }
  }


  if (dark && (scene === "cover" || scene === "closing")) {
    L.push(vignette("#000000", 0.35));
  }
  L.push(`linear-gradient(${r.surface}, ${r.surface})`);
  return L;
}

/**
 * Map a render seed onto a scene. Seeds carry the frame/layout key
 * (e.g. "S04-cover", "cover-hero", "chart-2"), so the section-specific preset
 * is picked without changing the `ground(seed)` contract.
 */
export function sceneFromSeed(seed: string | undefined | null): SkinScene {
  const s = (seed ?? "").toLowerCase();
  if (/cover|title|hero|opening/.test(s)) return "cover";
  if (/closing|thanks|end|cta|contact/.test(s)) return "closing";
  if (/agenda|contents|index|roadmap-list/.test(s)) return "agenda";
  if (/statement|manifesto|big|impact/.test(s)) return "statement";
  if (/stat|metric|kpi|number|gauge|dashboard/.test(s)) return "stats";
  if (/split|media|image|photo|visual/.test(s)) return "split";
  if (/bento|mosaic|grid-cards|modular/.test(s)) return "bento";
  if (/chart|graph|plot|table|data/.test(s)) return "chart";
  if (/quote|testimonial|voice/.test(s)) return "quote";
  if (/timeline|phase|milestone|process|cycle/.test(s)) return "timeline";
  return "section";
}

/** Human-readable description of a skin's background library, for the UI. */
export function skinBackgroundSummary(skin: DesignSkin): string {
  const fam = motifFamilyFor(skin);
  return `${MOTIF_LABEL[fam]} · ${SKIN_SCENES.length - 1} section presets`;
}

/** Backdrop loudness per scene (0–1), exposed for design-knowledge tooling. */
export const SCENE_INTENSITY: Record<SkinScene, number> = SCENE_GAIN;
