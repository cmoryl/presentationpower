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
  arcs: "Kinetic ribbons",
  halftone: "Editorial halftone",
  prism: "Prismatic light",
  orbit: "Orbital vectors",
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
 * APPROVED ART DIRECTION — S01–S28.
 *
 * Every approved visual language is ABSTRACT ONLY: material, geometry,
 * lighting, data rhythm and colour carry the industry meaning. No people, no
 * products, no photography, no logos, no icons, no baked text, no fake UI, no
 * readable charts. The motif family below is the hand-assigned gesture for each
 * catalog code, and `SKIN_SIGNATURE` gives each one its own rake, weight and
 * texture so two skins sharing a family still read as different designs.
 */
export const SKIN_MOTIF: Record<string, MotifFamily> = {
  S01: "mesh", //     sculptural white space, one cobalt light blade
  S02: "aurora", //   liquid-glass membrane, refracted edge light
  S03: "prism", //    diagonal mesh energy + system grid
  S04: "circuit", //  graphite layers, one electric seam
  S05: "brutal", //   black/white hard planes, cut geometry
  S06: "clinical", // disciplined modular enterprise grid
  S07: "wave", //     soft acrylic overlapping surfaces
  S08: "terrazzo", // bold controlled shape choreography
  S09: "blueprint", //engineering rails, traces, status rhythm
  S10: "arcs", //     connected pathways and nodes
  S11: "isotype", //  modular merchandising tile rhythm
  S12: "ledger", //   process lanes / control-room tracks
  S13: "mesh", //     asymmetric mosaic of transparent slabs
  S14: "civic", //    strict grid, one decisive red signal
  S15: "halftone", // editorial rules and evidence bands
  S16: "foil", //     monumental curve, bronze edge light
  S17: "contour", //  organic overlapping warm contours
  S18: "shards", //   dramatic directional light wedges
  S19: "blueprint", //drafting geometry, measurement rhythm
  S20: "orbit", //    luminous trajectories and waveforms
  S21: "wave", //     biomorphic translucent membranes
  S22: "halftone", // archival paper layers and marginal rules
  S23: "brutal", //   hard blocks, thick rules, deliberate tension
  S24: "isotype", //  floating glass forms, orbital trajectories
  S25: "shards", //   cropped rule-fields, impact stripes, speed
  S26: "prism", //    dark glass, explainable layered planes
  S27: "aurora", //   soft atmospheric volumes, outline-free
  S28: "terrazzo", // overlapping transparent mosaic planes

  /* Industry packs (R01–R30) — motif chosen for the sector, not derived. */
  R01: "mesh",
  R02: "isotype",
  R03: "aurora",
  R04: "prism",
  R05: "ledger",
  R06: "civic",
  R07: "circuit",
  R08: "clinical",
  R09: "orbit",
  R10: "halftone",
  R11: "ledger",
  R12: "blueprint",
  R13: "contour",
  R14: "shards",
  R15: "circuit",
  R16: "isotype",
  R17: "isotype",
  R18: "arcs",
  R19: "terrazzo",
  R20: "foil",
  R21: "shards",
  R22: "aurora",
  R23: "brutal",
  R24: "wave",
  R25: "blueprint",
  R26: "halftone",
  R27: "civic",
  R28: "contour",
  R29: "terrazzo",
  R30: "prism",
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

/** Angular survey crosshatch — replaces the old concentric-ring texture. */
const rings = (at: string, hex: string, a: number, gap: number) => {
  const lean = (parseFloat(at) || 50) > 50 ? 14 : -14;
  return `${rules(hex, a, gap, 24 + lean)}, ${rules(hex, a * 0.7, gap * 1.6, 108 + lean)}`;
};

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

/** Angular refraction — crossed feathered facets of light, no conic sweep. */
const caustic = (at: string, hexA: string, hexB: string, a: number): string[] => {
  const lean = (parseFloat(at) || 50) > 50 ? -1 : 1;
  return [
    `linear-gradient(${90 + lean * 34}deg, ${rgba(hexA, 0)} 6%, ${rgba(hexA, a)} 30%, ${rgba(hexA, a * 0.25)} 52%, ${rgba(hexA, 0)} 74%)`,
    `linear-gradient(${90 - lean * 68}deg, ${rgba(hexB, 0)} 22%, ${rgba(hexB, a * 0.85)} 48%, ${rgba(hexB, 0)} 78%)`,
    `linear-gradient(${90 + lean * 12}deg, ${rgba(hexB, a * 0.5)} 0%, ${rgba(hexB, 0)} 38%)`,
  ];
};

/**
 * Feathered angled sheet — a sculpted plane of light. Confined by GRADIENT
 * STOPS across the whole box rather than by background-size, so it never
 * leaves a hard rectangular seam on the cross axis.
 * `w` = sheet width as a percentage of the sweep; `at` picks which side it
 * hugs; `h` gently modulates strength.
 */
const blade = (
  at: string,
  hex: string,
  a: number,
  w: string,
  h: string,
  deg = 24,
): string => {
  const span = Math.max(16, Math.min(100, parseFloat(w) || 50));
  const gainH = Math.max(0.55, Math.min(1, (parseFloat(h) || 100) / 100 + 0.3));
  const far = /right|bottom/.test(at) && !/left|top/.test(at);
  const s0 = far ? 100 - span : 0;
  const s1 = far ? 100 : span;
  const f = Math.min(18, span * 0.34);
  const A = a * gainH;
  return `linear-gradient(${deg}deg, ${rgba(hex, 0)} ${Math.max(0, s0 - f)}%, ${rgba(hex, A)} ${Math.min(99, s0 + f * 0.6)}%, ${rgba(hex, A * 0.82)} ${Math.max(1, s1 - f * 0.6)}%, ${rgba(hex, 0)} ${Math.min(100, s1 + f)}%)`;
};

/**
 * One deliberate ring, sized as a PERCENTAGE of the sheet so it scales with
 * the slide box (px radii read correctly at 1920 and grotesque in a thumbnail).
 */
const halo = (at: string, hex: string, a: number, size: number, thick = 1.4): string =>
  `radial-gradient(${size}% ${(size * 16) / 9}% at ${at}, ${rgba(hex, 0)} 0 ${Math.max(0, 94 - thick * 2)}%, ${rgba(hex, a)} ${96 - thick}%, ${rgba(hex, a)} 96%, ${rgba(hex, 0)} 100%)`;

/** Soft directional grade — gives every sheet photographic depth. */
const grade = (deg: number, hexA: string, hexB: string, a: number): string =>
  `linear-gradient(${deg}deg, ${rgba(hexA, a)} 0%, ${rgba(hexA, 0)} 46%, ${rgba(hexB, a * 0.7)} 100%)`;

/** Frosted glass pane with a lit leading edge — feathered, seam-free. */
const glassPane = (at: string, hex: string, a: number, w: string, h: string): string[] => {
  const span = Math.max(20, Math.min(100, parseFloat(w) || 40));
  const far = /right|bottom/.test(at) && !/left|top/.test(at);
  const s0 = far ? 100 - span : 0;
  const s1 = far ? 100 : span;
  const edge = far ? s0 : s1;
  return [
    `linear-gradient(100deg, ${rgba(hex, 0)} ${Math.max(0, s0 - 8)}%, ${rgba(hex, a * 0.85)} ${Math.min(99, s0 + 6)}%, ${rgba(hex, a * 0.25)} ${(s0 + s1) / 2}%, ${rgba(hex, a * 0.55)} ${Math.max(1, s1 - 4)}%, ${rgba(hex, 0)} ${Math.min(100, s1 + 8)}%)`,
    `linear-gradient(100deg, ${rgba(hex, 0)} ${Math.max(0, edge - 3.5)}%, ${rgba(hex, Math.min(0.3, a * 0.9))} ${edge}%, ${rgba(hex, 0)} ${Math.min(100, edge + 3.5)}%)`,
  ];
};

/** Tight spotlight core with long falloff — stagecraft lighting. */
const spot = (at: string, hex: string, a: number, size = 54): string =>
  `radial-gradient(${size}% ${size * 0.82}% at ${at}, ${rgba(hex, a)} 0%, ${rgba(hex, a * 0.34)} 30%, ${rgba(hex, 0)} 68%)`;

/* --------------------------------------------------- architectural gestures */
// Every family below is built as ONE dominant gesture + counterform + texture.
// These primitives supply the dominant gestures, so no sheet is ever just a
// wash with a stray part floating in it.

/**
 * Thick feathered RIBBON — a sweeping straight band of colour laid across the
 * frame at an angle derived from its anchor. Replaces the old annulus/arc
 * gesture: no circular sweeps anywhere in the backdrop system.
 * `size` positions the band (larger = further from the anchor edge),
 * `thick` is its weight.
 */
const arcBand = (
  at: string,
  hex: string,
  a: number,
  size: number,
  thick = 8,
): string => {
  const parts = at.trim().split(/\s+/);
  const x = parseFloat(parts[0] ?? "50");
  const y = parseFloat(parts[1] ?? "50");
  const deg = 90 + (x > 50 ? -1 : 1) * (y > 50 ? 24 : 62);
  const t = Math.max(5, Math.min(30, thick * 2.4));
  const c = Math.max(t, Math.min(100 - t, 104 - size * 0.72));
  const s0 = c - t / 2;
  const s1 = c + t / 2;
  const f = t * 0.55;
  return `linear-gradient(${deg}deg, ${rgba(hex, 0)} ${Math.max(0, s0 - f)}%, ${rgba(hex, a * 0.65)} ${s0}%, ${rgba(hex, a * 1.35)} ${(s0 + s1) / 2}%, ${rgba(hex, a * 0.6)} ${s1}%, ${rgba(hex, 0)} ${Math.min(100, s1 + f)}%)`;
};

/**
 * Scattered terrazzo chips at pseudo-random positions and sizes — poured, not
 * tiled, so it never reads as a polka-dot grid.
 */
const chips = (hex: string, hexB: string, a: number, seed: number, n = 14): string[] => {
  const out: string[] = [];
  let s = seed || 7;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const x = 4 + ((s >> 5) % 88);
    const y = 6 + ((s >> 11) % 84);
    const w = 2 + ((s >> 17) % 40) / 8; // 2 – 7 % wide
    const h = 1.4 + ((s >> 19) % 30) / 9; // 1.4 – 4.7 % tall
    const c = i % 3 === 0 ? hexB : hex;
    const alpha = a * (0.6 + ((s >> 21) % 5) / 8);
    // Hard-edged angular chip: a small skewed plate, not a dot.
    out.push(
      `linear-gradient(${((s >> 23) % 4) * 45}deg, ${rgba(c, alpha)} 0 100%) ${x}% ${y}% / ${w}% ${h}% no-repeat`,
    );
  }
  return out;
};


/**
 * Vertical plate — architectural column of colour.
 *
 * COHESION: the feather used to be a fixed 1.2%, which read as a hard vertical
 * SPLIT down the sheet and cut the composition in two. The feather now scales
 * with the plate (min 5% of the frame), so a plate reads as a broad drift of
 * colour that belongs to the field instead of a pasted-on panel.
 */
const plateV = (x: number, w: number, hex: string, a: number): string => {
  const f = Math.max(5, w * 0.55);
  return `linear-gradient(90deg, ${rgba(hex, 0)} ${Math.max(0, x - f)}%, ${rgba(hex, a * 0.85)} ${x}%, ${rgba(hex, a * 0.7)} ${Math.min(100, x + w)}%, ${rgba(hex, 0)} ${Math.min(100, x + w + f)}%)`;
};

/** Horizontal plate — stacked band / horizon terrace (same soft-edge rule). */
const plateH = (y: number, h: number, hex: string, a: number): string => {
  // Masthead/base rules (very thin plates) keep a crisp edge: they are a
  // deliberate typographic rule, not a colour split.
  const f = h <= 2.6 ? 0.6 : Math.max(4, h * 0.55);
  return `linear-gradient(180deg, ${rgba(hex, 0)} ${Math.max(0, y - f)}%, ${rgba(hex, a * (h <= 2.6 ? 1 : 0.85))} ${y}%, ${rgba(hex, a * 0.7)} ${Math.min(100, y + h)}%, ${rgba(hex, 0)} ${Math.min(100, y + h + f)}%)`;
};

/** Layered horizon terraces — landscape/energy register. */
const strata = (hex: string, hexB: string, a: number, flip: boolean): string[] => {
  const ys = flip ? [44, 60, 76] : [52, 66, 82];
  return ys.map((y, i) =>
    plateH(y, i === 0 ? 16 : 12, i % 2 ? hexB : hex, a * (1 - i * 0.22)),
  );
};

/** Corner frame — two rules and a corner block, drafting-table register. */
const frame = (hex: string, a: number, inset: number, flip: boolean): string[] => [
  plateV(flip ? 100 - inset : inset, 0.45, hex, a),
  plateH(inset, 0.45, hex, a),
  plateH(100 - inset, 0.45, hex, a * 0.7),
];

/** Interlocking cross-plates — modular / product-grid register. */
const cross = (hex: string, hexB: string, a: number, flip: boolean): string[] => [
  plateV(flip ? 58 : 22, 20, hex, a),
  plateH(flip ? 26 : 58, 18, hexB, a * 0.72),
];

/**
 * Big wedge of colour — kinetic / sport / agency register. The leading edge is
 * feathered (was a 3% hard cut) so the sheet never reads as two halves.
 */
const wedge = (hex: string, a: number, deg: number, span: number, flip: boolean): string => {
  const s = flip ? 100 - span : span;
  return `linear-gradient(${deg}deg, ${rgba(hex, a)} 0%, ${rgba(hex, a * 0.78)} ${Math.max(0, s - 14)}%, ${rgba(hex, a * 0.4)} ${s}%, ${rgba(hex, 0)} ${Math.min(100, s + 16)}%)`;
};





/* ------------------------------------------- zoned apparatus (crisp marks) */
// The soft primitives above supply light. These supply DRAWING: hard-edged,
// industry-legible instruments confined to a zone of the frame, so a sheet
// reads as an art-directed diagram of its sector rather than a blurred wash.
// Every one is positioned + sized `no-repeat`, which is what lets a repeating
// gradient live inside a rectangle instead of tiling the whole page.

/** Confine any gradient to a rectangle of the sheet. */
/**
 * READING-ZONE CLEARANCE.
 *
 * Every drawn instrument (bars, rails, traces, lattices, screens) is placed as
 * a positioned rect. Those rects used to be allowed to sit anywhere, which put
 * hard geometry directly under headlines, KPI tiles and charts. The reading
 * area is now protected: any apparatus rect that would intersect it is pushed
 * and clipped to the nearest outer margin, so the centre of the frame stays
 * pure atmosphere and the geometry becomes an edge detail.
 */
const SAFE = { x0: 15, x1: 85, y0: 19, y1: 81 };

/** CSS `background-position` in % aligns proportionally: resolve the real rect. */
function rectOf(x: number, y: number, w: number, h: number) {
  return {
    left: (x * (100 - w)) / 100,
    top: (y * (100 - h)) / 100,
    w,
    h,
  };
}

/** Position (%) that puts a `w`-wide rect with its left edge at `left`. */
function posFor(left: number, w: number): number {
  if (w >= 100) return 0;
  return Math.max(0, Math.min(100, (left / (100 - w)) * 100));
}

function clearReadingZone(
  x: number,
  y: number,
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number } {
  // Full-bleed washes and grades are atmosphere, not apparatus — leave them.
  if (w > 78 || h > 78) return { x, y, w, h };
  const rect = rectOf(x, y, w, h);
  const overlapsX = rect.left < SAFE.x1 && rect.left + rect.w > SAFE.x0;
  const overlapsY = rect.top < SAFE.y1 && rect.top + rect.h > SAFE.y0;
  if (!overlapsX || !overlapsY) return { x, y, w, h };

  const cx = rect.left + rect.w / 2;
  const cy = rect.top + rect.h / 2;
  // Displace along the axis where the rect is slimmer: a tall slim panel
  // becomes a side column, a wide flat band becomes a top/bottom band.
  if (rect.w <= rect.h) {
    const room = SAFE.x0;
    const nw = Math.min(rect.w, room);
    const left = cx < 50 ? 0 : 100 - nw;
    return { x: posFor(left, nw), y, w: nw, h };
  }
  const room = cy < 50 ? SAFE.y0 : 100 - SAFE.y1;
  const nh = Math.min(rect.h, room);
  const top = cy < 50 ? 0 : 100 - nh;
  return { x, y: posFor(top, nh), w, h: nh };
}

const zoned = (grad: string, x: number, y: number, w: number, h: number): string => {
  const c = clearReadingZone(x, y, w, h);
  return `${grad} ${c.x}% ${c.y}% / ${c.w}% ${c.h}% no-repeat`;
};


/** Column series — a bar chart drawn in the field. */
const barsZone = (
  hex: string,
  a: number,
  x: number,
  y: number,
  w: number,
  h: number,
  bar = 9,
  gapPx = 22,
): string =>
  zoned(
    `repeating-linear-gradient(90deg, ${rgba(hex, a)} 0 ${bar}px, ${rgba(hex, 0)} ${bar}px ${gapPx}px)`,
    x,
    y,
    w,
    h,
  );

/** Graduated measure rail — long rule with regular ticks hanging off it. */
const railZone = (
  hex: string,
  a: number,
  x: number,
  y: number,
  w: number,
  h: number,
  tick = 18,
): string[] => [
  zoned(`linear-gradient(${rgba(hex, a * 1.3)} 0 100%)`, x, y, w, 0.22),
  zoned(
    `repeating-linear-gradient(90deg, ${rgba(hex, a)} 0 1.5px, ${rgba(hex, 0)} 1.5px ${tick}px)`,
    x,
    y,
    w,
    h,
  ),
];

/** Stacked slats — spectrum / louvre / laminate register. */
const slatZone = (
  hex: string,
  hexB: string,
  a: number,
  x: number,
  y: number,
  w: number,
  h: number,
  deg = 0,
  pitch = 16,
): string[] => [
  zoned(
    `repeating-linear-gradient(${deg}deg, ${rgba(hex, a)} 0 4px, ${rgba(hex, 0)} 4px ${pitch}px)`,
    x,
    y,
    w,
    h,
  ),
  zoned(
    `repeating-linear-gradient(${deg}deg, ${rgba(hexB, a * 0.6)} 0 1.5px, ${rgba(hexB, 0)} 1.5px ${pitch / 2}px)`,
    x,
    y,
    w,
    h,
  ),
];

/** Dense measured grid held inside a plate — clinical / drafting register. */
const gridZone = (
  hex: string,
  a: number,
  x: number,
  y: number,
  w: number,
  h: number,
  pitch = 26,
): string[] => [
  zoned(
    `repeating-linear-gradient(90deg, ${rgba(hex, a)} 0 1px, ${rgba(hex, 0)} 1px ${pitch}px)`,
    x,
    y,
    w,
    h,
  ),
  zoned(
    `repeating-linear-gradient(0deg, ${rgba(hex, a)} 0 1px, ${rgba(hex, 0)} 1px ${pitch}px)`,
    x,
    y,
    w,
    h,
  ),
];

/** Chevron stack — kinetic / retail / motion register. */
const chevronZone = (
  hex: string,
  a: number,
  x: number,
  y: number,
  w: number,
  h: number,
  pitch = 26,
  lean = 34,
): string[] => [
  zoned(
    `repeating-linear-gradient(${lean}deg, ${rgba(hex, a)} 0 5px, ${rgba(hex, 0)} 5px ${pitch}px)`,
    x,
    y,
    w / 2,
    h,
  ),
  zoned(
    `repeating-linear-gradient(${-lean}deg, ${rgba(hex, a)} 0 5px, ${rgba(hex, 0)} 5px ${pitch}px)`,
    x + w / 2,
    y,
    w / 2,
    h,
  ),
];

/** Colonnade — evenly spaced heavy pillars. Civic / institutional register. */
const pillarZone = (
  hex: string,
  a: number,
  x: number,
  y: number,
  w: number,
  h: number,
  pitch = 54,
): string =>
  zoned(
    `repeating-linear-gradient(90deg, ${rgba(hex, a)} 0 ${Math.round(pitch * 0.34)}px, ${rgba(hex, 0)} ${Math.round(pitch * 0.34)}px ${pitch}px)`,
    x,
    y,
    w,
    h,
  );

/** Routed traces with square pads — silicon / network register. */
const traceZone = (
  hex: string,
  a: number,
  x: number,
  y: number,
  w: number,
  h: number,
  pitch = 34,
): string[] => [
  zoned(
    `repeating-linear-gradient(90deg, ${rgba(hex, a)} 0 1.4px, ${rgba(hex, 0)} 1.4px ${pitch}px)`,
    x,
    y,
    w,
    h,
  ),
  zoned(
    `repeating-linear-gradient(0deg, ${rgba(hex, a * 0.8)} 0 1.4px, ${rgba(hex, 0)} 1.4px ${pitch}px)`,
    x,
    y,
    w,
    h,
  ),
  zoned(
    `repeating-linear-gradient(45deg, ${rgba(hex, a * 0.55)} 0 1.2px, ${rgba(hex, 0)} 1.2px ${pitch * 2}px)`,
    x,
    y,
    w,
    h,
  ),
];

/** Stepped trace — a monitoring / pulse readout drawn as offset segments. */
const pulseZone = (
  hex: string,
  a: number,
  x: number,
  y: number,
  w: number,
  h: number,
  seed = 3,
  n = 7,
): string[] => {
  const out: string[] = [];
  const seg = w / n;
  const steps = 4; // quantised levels — a readout, not noise
  let s = seed || 5;
  let prev = y + h / 2;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const level = (s >> 9) % steps;
    const yy = y + (level / (steps - 1)) * (h - h * 0.14);
    // Horizontal plateau.
    out.push(zoned(`linear-gradient(${rgba(hex, a)} 0 100%)`, x + i * seg, yy, seg, h * 0.055));
    // Vertical riser joining the previous plateau, drawn only where it moves.
    if (i > 0 && Math.abs(yy - prev) > h * 0.06) {
      out.push(
        zoned(
          `linear-gradient(${rgba(hex, a * 0.85)} 0 100%)`,
          x + i * seg,
          Math.min(yy, prev),
          0.32,
          Math.abs(yy - prev) + h * 0.055,
        ),
      );
    }
    prev = yy;
  }
  return out;
};

/** Isometric lattice confined to a plate. */
const isoZone = (
  hex: string,
  a: number,
  x: number,
  y: number,
  w: number,
  h: number,
  pitch = 30,
): string[] => [
  zoned(
    `repeating-linear-gradient(60deg, ${rgba(hex, a)} 0 1.2px, ${rgba(hex, 0)} 1.2px ${pitch}px)`,
    x,
    y,
    w,
    h,
  ),
  zoned(
    `repeating-linear-gradient(120deg, ${rgba(hex, a)} 0 1.2px, ${rgba(hex, 0)} 1.2px ${pitch}px)`,
    x,
    y,
    w,
    h,
  ),
  zoned(
    `repeating-linear-gradient(0deg, ${rgba(hex, a * 0.7)} 0 1.2px, ${rgba(hex, 0)} 1.2px ${pitch * 1.7}px)`,
    x,
    y,
    w,
    h,
  ),
];

/** Diamond lattice — halftone/editorial screen with real presence. */
const screenZone = (
  hex: string,
  a: number,
  x: number,
  y: number,
  w: number,
  h: number,
  pitch = 14,
): string[] => [
  zoned(
    `repeating-linear-gradient(45deg, ${rgba(hex, a)} 0 2px, ${rgba(hex, 0)} 2px ${pitch}px)`,
    x,
    y,
    w,
    h,
  ),
  zoned(
    `repeating-linear-gradient(-45deg, ${rgba(hex, a)} 0 2px, ${rgba(hex, 0)} 2px ${pitch}px)`,
    x,
    y,
    w,
    h,
  ),
];

/* ---------------------------------------------------------------- intensity */


/** Loudness per scene: covers/closings sing, content sections stay calm. */
const SCENE_GAIN: Record<SkinScene, number> = {
  // Covers and closings still sing. Every content scene is deliberately quieter
  // than before: the backdrop is atmosphere behind the information design, not
  // a competing graphic.
  cover: 0.9,
  closing: 0.8,
  statement: 0.62,
  quote: 0.5,
  split: 0.4,
  bento: 0.38,
  stats: 0.34,
  timeline: 0.34,
  agenda: 0.32,
  chart: 0.24,
  section: 0.4,
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

/** How many alternate compositions ("takes") exist per skin × scene. */
export const SKIN_BG_TAKES = 4;

/** Take labels for pickers. */
export const TAKE_LABEL = ["Take A", "Take B", "Take C", "Take D"];

/**
 * Build the layered backdrop for one skin + one deck section.
 * Topmost layer first, page field last — matching CSS `background` order.
 *
 * `take` selects an ALTERNATE COMPOSITION of the same visual language: the
 * motif family, palette and register stay identical, while the geometry knobs
 * (variant, mirroring, rhythm, rake, light anchor and loudness) all shift
 * deterministically. Take 0 is the canonical composition, so existing ids and
 * exports render exactly as before.
 */
export function skinBackgroundLayers(
  skin: DesignSkin,
  scene: SkinScene,
  r: SkinBgRoles,
  take = 0,
): string[] {
  const family = motifFamilyFor(skin);
  const t = ((take % SKIN_BG_TAKES) + SKIN_BG_TAKES) % SKIN_BG_TAKES;
  const seed = skinSeed(skin) + t * 2654435;
  const g = Math.min(1, (SCENE_GAIN[scene] ?? 0.55) * [1, 1.12, 0.86, 1.04][t]!);
  const v = seed % 4; // per-skin geometry variant
  const flip = (seed >> 3) % 2 === 1;
  const gapK = 0.78 + ((seed >> 5) % 5) * 0.14; // 0.78 – 1.34
  const rot = ((seed >> 7) % 7) * 9 - 27; // -27 – +27 deg
  const sceneOrder = SKIN_SCENES;
  const baseAnchor =
    t === 0
      ? (SCENE_ANCHOR[scene] ?? "76% 14%")
      : (SCENE_ANCHOR[
          sceneOrder[(sceneOrder.indexOf(scene) + t * 3) % sceneOrder.length]!
        ] ?? "76% 14%");
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
  // Light sheets used to wash out to invisibility, which read as "empty".
  // Floors keep the dominant gesture legible in both registers.
  const a = (base: number) =>
    Math.min(0.72, Math.max(base * 0.34, base * g * punch * (dark ? 1.7 : 1.5)));
  const line = (base: number) =>
    Math.min(0.26, Math.max(base * 0.4, base * (0.6 + g * 0.6) * Math.min(punch, 1.8) * (dark ? 1.5 : 1.35)));

  // Crisp apparatus alpha: the drawn instruments (bars, rails, traces, screens)
  // are the *subject* of the sheet, so they get real presence instead of the
  // whisper reserved for substrate texture.
  // Near-black fields swallow hairlines, so the apparatus gets extra body there.
  const inkyBoost = lum(r.surface) < 0.08 ? 1.55 : lum(r.surface) < 0.16 ? 1.25 : 1;
  // Apparatus is now an EDGE detail, not the subject: it reads as machined
  // texture at the margins instead of hard geometry competing with the copy.
  const mark = (base: number) =>
    Math.min(0.34, Math.max(base * 0.34 * inkyBoost, base * (0.34 + g * 0.42) * Math.min(punch, 1.6) * (dark ? 1.2 : 1.05) * inkyBoost));


  const gap = (n: number) => Math.max(8, Math.round(n * gapK));
  const tint = mixHex(r.accent, r.accentAlt, 0.5);
  const L: string[] = [];
  const wide = scene === "cover" || scene === "closing" || scene === "statement";

  // Each family is a COMPOSITION, not a pile of parts: one dominant gesture
  // (arc, plate group, wedge, terrace, mesh), one counterform that answers it,
  // then structural texture only ever as a faint substrate beneath.
  switch (family) {
    case "mesh": {
      // Enterprise SaaS: broad sculpted light, one glass sheet across it.
      L.push(...meshField(r.accent, r.accentAlt, tint, a(0.3), flip));
      L.push(...glassPane(flip ? "left top" : "right top", tint, a(0.2), "44%", "100%"));
      L.push(plateV(flip ? 6 : 70, wide ? 24 : 18, r.accent, a(0.12)));
      L.push(arcBand(flip ? "-8% 110%" : "108% 110%", r.accentAlt, a(0.16), wide ? 58 : 46, 7));
      L.push(spot(anchor, r.accent, a(0.22), wide ? 76 : 58));
      L.push(...isoZone(r.accent, mark(0.32), flip ? 4 : 52, wide ? 46 : 54, 44, 40, gap(16)));
      L.push(dots(r.ink, line(0.035), gap(34), 1));
      break;
    }
    case "ledger": {
      // Finance: ruled ledger plates, a keyline rail and a quiet corner arc.
      L.push(plateV(flip ? 4 : 74, wide ? 22 : 16, r.accent, a(0.2)));
      L.push(plateH(scene === "chart" ? 84 : 8, 2.4, r.accent, a(0.46)));
      L.push(arcBand(flip ? "-4% 104%" : "104% -4%", r.accentAlt, a(0.2), wide ? 52 : 40, 7));
      L.push(spot(anchor, r.accent, a(0.14), 62));
      L.push(barsZone(r.accent, mark(0.4), flip ? 8 : 46, wide ? 52 : 58, 46, wide ? 34 : 28, 8, gap(24)));
      L.push(...railZone(r.ink, mark(0.24), flip ? 8 : 46, wide ? 86 : 87, 46, 3.4, gap(20)));
      L.push(rules(r.ink, line(0.05), gap(56), 0));
      break;
    }
    case "clinical": {
      // Healthcare/pharma: measured cross-plates, calm centred light.
      L.push(...cross(r.accent, r.accentAlt, a(0.13), flip));
      L.push(arcBand(flip ? "-6% 50%" : "106% 50%", r.accent, a(0.2), wide ? 62 : 48, 7));
      L.push(spot("50% 44%", r.accentAlt, a(0.18), 74));
      L.push(...pulseZone(r.accent, mark(0.54), flip ? 6 : 44, wide ? 60 : 64, 50, wide ? 24 : 20, seed, 8));
      L.push(...gridZone(r.ink, mark(0.22), flip ? 6 : 44, wide ? 60 : 64, 50, wide ? 24 : 20, gap(26)));
      L.push(rules(r.ink, line(0.026), gap(46)));
      break;
    }
    case "foil": {
      // Luxury: poured metal caustics raked across a graded field.
      L.push(...caustic(anchor, r.accent, r.accentAlt, a(0.26)));
      L.push(wedge(r.accent, a(0.2), 104 + rot, flip ? 62 : 38, flip));
      L.push(plateH(flip ? 92 : 6, 1.2, r.accentAlt, a(0.5)));
      L.push(...slatZone(r.accentAlt, r.accent, mark(0.26), flip ? 2 : 54, 12, 44, wide ? 76 : 70, 104 + rot, gap(18)));
      L.push(grade(160, r.accentAlt, r.accent, a(0.12)));
      L.push(vignette(dark ? "#000000" : r.ink, dark ? 0.38 * g : 0.08 * g));
      break;
    }
    case "blueprint": {
      // Engineering/manufacturing: drafting frame over a two-scale grid.
      L.push(...frame(r.accent, a(0.34), wide ? 7 : 5, flip));
      L.push(plateV(flip ? 62 : 26, 12, r.accent, a(0.12)));
      L.push(arcBand(flip ? "-6% 92%" : "106% 8%", r.accentAlt, a(0.18), wide ? 50 : 38, 7));
      L.push(...gridZone(r.accent, mark(0.3), flip ? 8 : 52, wide ? 40 : 46, 40, wide ? 48 : 42, gap(22)));
      L.push(...railZone(r.accent, mark(0.3), flip ? 8 : 52, wide ? 34 : 40, 40, 2.6, gap(16)));
      L.push(rules(r.accent, line(0.05), gap(88)));
      L.push(rules(r.ink, line(0.024), gap(22)));
      break;
    }
    case "shards": {
      // Creative/agency/sport: crossing wedges with a cut counterform.
      L.push(wedge(r.accent, a(0.3), 26 + rot, flip ? 58 : 42, flip));
      L.push(wedge(r.accentAlt, a(0.24), 148 + rot, flip ? 40 : 60, !flip));
      L.push(shard(flip ? "left bottom" : "right top", tint, a(0.2), "34%", "48%", 62));
      L.push(plateH(flip ? 4 : 94, wide ? 4 : 2, tint, a(0.45)));
      L.push(...chevronZone(tint, mark(0.3), flip ? 4 : 50, wide ? 46 : 54, 46, wide ? 44 : 38, gap(24), 38));
      break;
    }
    case "civic": {
      // Public sector: masthead and footer plates, one column, no noise.
      L.push(plateH(0, wide ? 16 : 7, r.accent, a(0.34)));
      L.push(plateH(wide ? 92 : 95, wide ? 6 : 3, r.accentAlt, a(0.3)));
      L.push(plateV(flip ? 8 : 72, wide ? 20 : 14, r.accentAlt, a(0.12)));
      L.push(spot(anchor, r.accent, a(0.16), 66));
      L.push(pillarZone(r.accent, mark(0.26), flip ? 6 : 46, wide ? 40 : 46, 48, wide ? 50 : 44, gap(56)));
      L.push(rules(r.ink, line(0.03), gap(68), 0));
      break;
    }
    case "contour": {
      // Energy/climate/agriculture: terraced horizons plus survey contours.
      L.push(...strata(r.accent, r.accentAlt, a(0.26), flip));
      L.push(arcBand(flip ? "12% 116%" : "88% 116%", r.accent, a(0.16), wide ? 56 : 44, 9));
      L.push(...slatZone(r.accent, r.accentAlt, mark(0.24), 0, wide ? 52 : 58, 100, wide ? 44 : 40, 6, gap(20)));
      L.push(...railZone(r.ink, mark(0.18), flip ? 6 : 48, wide ? 26 : 30, 46, 3, gap(22)));
      L.push(spot(anchor, tint, a(0.18), 84));
      break;
    }
    case "arcs": {
      // Retail/consumer: stacked kinetic ribbons rising across the frame.
      const pivot = flip ? "2% 106%" : "98% 106%";
      L.push(arcBand(pivot, r.accent, a(0.26), wide ? 44 : 34, 8));
      L.push(arcBand(pivot, r.accentAlt, a(0.19), wide ? 64 : 50, 6));
      L.push(arcBand(pivot, tint, a(0.13), wide ? 84 : 68, 5));
      L.push(...chevronZone(r.accentAlt, mark(0.28), flip ? 2 : 52, wide ? 50 : 56, 46, wide ? 42 : 36, gap(26), 30));
      L.push(spot(anchor, r.accent, a(0.2), 62));
      break;
    }
    case "halftone": {
      // Editorial/press: column rule, masthead bar, graded halftone field.
      L.push(plateH(0, 1.8, r.ink, a(0.55)));
      L.push(plateV(flip ? 34 : 64, 0.4, r.ink, a(0.3)));
      L.push(plateV(flip ? 4 : 66, wide ? 30 : 24, r.accentAlt, a(0.12)));
      L.push(spot(anchor, r.accent, a(0.2), wide ? 72 : 56));
      L.push(...screenZone(r.ink, mark(0.2), flip ? 4 : 50, wide ? 40 : 48, 46, wide ? 52 : 44, gap(14)));
      L.push(dots(r.ink, line(0.05), gap(wide ? 13 : 19), 1.5));
      break;
    }
    case "prism": {
      // Data/analytics: refracted glass panes fanned across caustic light.
      L.push(...caustic(anchor, r.accent, r.accentAlt, a(0.26)));
      L.push(...glassPane(flip ? "left top" : "right top", r.accentAlt, a(0.22), "38%", "100%"));
      L.push(wedge(tint, a(0.16), 68 + rot, flip ? 56 : 44, flip));
      L.push(...slatZone(r.accent, r.accentAlt, mark(0.28), flip ? 4 : 50, 14, 46, wide ? 72 : 66, 96 + rot, gap(20)));
      L.push(plateH(74, 26, tint, a(0.1)));
      break;
    }
    case "orbit": {
      // Aerospace/telecom: long trajectory ribbons plus a tick marker.
      const pivot = flip ? "18% 108%" : "84% -8%";
      L.push(arcBand(pivot, r.accent, a(0.22), wide ? 46 : 34, 7));
      L.push(arcBand(pivot, r.accentAlt, a(0.15), wide ? 68 : 52, 5));
      L.push(band(flip ? "22% 46%" : "78% 46%", r.accentAlt, a(0.4), "2px", "8%"));
      L.push(spot(anchor, r.accent, a(0.2), 76));
      L.push(...railZone(r.accent, mark(0.3), flip ? 6 : 46, wide ? 72 : 76, 48, 4, gap(18)));
      L.push(...isoZone(r.accentAlt, mark(0.16), flip ? 6 : 46, wide ? 24 : 30, 48, 34, gap(34)));
      L.push(dots(r.ink, line(0.03), gap(44), 1));
      break;
    }
    case "wave": {
      // Travel/logistics/marine: stacked tidal sheets plus a sweeping crest.
      L.push(tide(r.accent, a(0.3), flip ? "right bottom" : "left bottom", "130%", "62%"));
      L.push(tide(r.accentAlt, a(0.22), flip ? "left bottom" : "right bottom", "110%", "44%"));
      L.push(arcBand(flip ? "6% 122%" : "94% 122%", tint, a(0.18), wide ? 60 : 46, 9));
      L.push(...slatZone(tint, r.accentAlt, mark(0.22), 0, wide ? 58 : 64, 100, wide ? 38 : 32, 172, gap(18)));
      L.push(spot(anchor, tint, a(0.18), 84));
      break;
    }
    case "circuit": {
      // Semiconductor/hardware: routed traces, a bus plate and a via node.
      L.push(plateV(flip ? 66 : 22, wide ? 14 : 10, r.accent, a(0.14)));
      L.push(plateH(flip ? 22 : 70, wide ? 10 : 7, r.accentAlt, a(0.12)));
      L.push(
        band(
          `${flip ? 18 : 68}% ${wide ? 60 : 66}%`,
          r.accentAlt,
          a(0.5),
          "11px",
          "11px",
        ),
      );
      L.push(arcBand(flip ? "-4% 6%" : "104% 6%", r.accent, a(0.16), wide ? 46 : 36, 6));
      L.push(...traceZone(r.accent, mark(0.32), flip ? 4 : 50, wide ? 40 : 46, 46, wide ? 50 : 44, gap(32)));
      L.push(trace(r.accent, line(0.05), gap(36)));
      break;
    }
    case "terrazzo": {
      // Hospitality/food: poured terrazzo chips held by a plate and a swash.
      L.push(plateV(flip ? 2 : 68, wide ? 30 : 22, r.accent, a(0.13)));
      L.push(arcBand(flip ? "-6% 6%" : "106% 6%", r.accentAlt, a(0.17), wide ? 52 : 40, 8));
      L.push(...chips(r.accent, r.accentAlt, a(0.34), seed, wide ? 18 : 13));
      L.push(...screenZone(r.accentAlt, mark(0.16), flip ? 4 : 52, wide ? 46 : 52, 44, wide ? 44 : 38, gap(18)));
      L.push(spot(anchor, r.accent, a(0.2), wide ? 74 : 58));
      break;
    }
    case "aurora": {
      // Fintech/crypto: broad aurora mesh, ribboned light, no hard geometry.
      L.push(...meshField(r.accent, r.accentAlt, tint, a(0.34), flip));
      L.push(...caustic(anchor, r.accent, r.accentAlt, a(0.18)));
      L.push(arcBand(flip ? "10% 118%" : "90% 118%", tint, a(0.14), wide ? 68 : 54, 11));
      L.push(...slatZone(tint, r.accent, mark(0.2), flip ? 2 : 54, wide ? 50 : 56, 44, wide ? 40 : 34, 90 + rot, gap(22)));
      L.push(grade(20 + rot, r.accentAlt, r.accent, a(0.12)));
      break;
    }
    case "brutal": {
      // Bold/industrial: one heavy column, a base rule and a stamped block.
      L.push(plateV(flip ? 66 : 0, wide ? 34 : 16, r.accent, a(0.42)));
      L.push(plateH(wide ? 93 : 96, wide ? 5 : 2.4, r.ink, a(0.4)));
      L.push(plateH(flip ? 12 : 0, wide ? 8 : 4, r.accentAlt, a(0.28)));
      L.push(wedge(r.accentAlt, a(0.14), 0, flip ? 30 : 70, flip));
      L.push(...chevronZone(r.ink, mark(0.22), flip ? 4 : 50, wide ? 44 : 50, 46, wide ? 46 : 40, gap(22), 45));
      L.push(stripes(r.ink, line(0.04), gap(22), 45, 3));
      break;
    }
    case "isotype": {
      // Education/nonprofit: modular plates on an isometric lattice.
      L.push(...cross(r.accent, r.accentAlt, a(0.15), flip));
      L.push(arcBand(flip ? "-8% 104%" : "108% 104%", r.accentAlt, a(0.18), wide ? 54 : 42, 8));
      L.push(spot(anchor, r.accentAlt, a(0.18), 78));
      L.push(...isoZone(r.accent, mark(0.3), flip ? 4 : 50, wide ? 40 : 48, 46, wide ? 50 : 44, gap(28)));
      L.push(isoGrid(r.accent, line(0.04), gap(40)));
      break;
    }
  }


  // ---------------------------------------------------------------------
  // COHESION BUDGET.
  //
  // Each family above composes a dominant gesture, a counterform, crisp
  // instrument zones and a tiled substrate. Stacked in full, content sheets
  // read as BUSY split graphics that fight the information design. The budget
  // keeps one cohesive field per sheet: a handful of soft gestures, at most a
  // whisper of instrument or substrate, and nothing tiled on content scenes.
  // ---------------------------------------------------------------------
  {
    // Crisp instrument zone: a repeating pattern confined to a positioned rect.
    const isZone = (l: string) => /repeating-/.test(l) && /no-repeat/.test(l);
    // Tiled substrate: repeats across the whole sheet (rules, dots, traces).
    const isTiled = (l: string) => /repeating-/.test(l) || /\/\s*\d+px\s+\d+px/.test(l);
    // Small placed detail (terrazzo chips, via nodes, tick markers).
    const isDetail = (l: string) => {
      const m = /\/\s*([\d.]+)(%|px)\s+([\d.]+)(%|px)/.exec(l);
      if (!m || !/no-repeat/.test(l)) return false;
      const w = parseFloat(m[1]!);
      const h = parseFloat(m[3]!);
      return (m[2] === "px" || w <= 14) && (m[4] === "px" || h <= 14);
    };
    const budget = {
      gesture: wide ? 4 : 3,
      zone: wide ? 1 : 0,
      tiled: wide ? 1 : 0,
      detail: wide ? 10 : 5,
    };
    const used = { gesture: 0, zone: 0, tiled: 0, detail: 0 };
    const kept: string[] = [];
    for (const layer of L) {
      const bucket = isDetail(layer)
        ? "detail"
        : isZone(layer)
          ? "zone"
          : isTiled(layer)
            ? "tiled"
            : "gesture";
      if (used[bucket]++ < budget[bucket]) kept.push(layer);
    }
    L.length = 0;
    L.push(...kept);
  }




  // ---------------------------------------------------------------------
  // HYPER-REAL ATMOSPHERE (topmost).
  //
  // What makes a backdrop feel photographed rather than drawn is depth: a
  // key light, a bounce, refracted colour spill, aerial haze over the middle
  // distance and a fine grain across everything. These sit ABOVE the drawn
  // apparatus, so the geometry recedes into the atmosphere instead of sitting
  // on top of the reading area as hard shapes.
  // ---------------------------------------------------------------------
  const keyAt = anchor;
  const fillAt = flip ? "18% 82%" : "82% 78%";
  L.unshift(
    // Fine photographic grain — the single strongest realism cue.
    dots(dark ? "#ffffff" : r.ink, dark ? 0.03 : 0.024, 3, 0.5),
    // Aerial haze veiling the middle distance (keeps the centre readable).
    `radial-gradient(118% 84% at 50% 52%, ${rgba(dark ? r.surface : "#ffffff", dark ? 0.26 : 0.26)} 0%, ${rgba(dark ? r.surface : "#ffffff", 0)} 66%)`,
    // Refracted colour spill from the key light.
    blob(keyAt, r.accent, a(0.2) * (dark ? 0.45 : 0.7), 96, 74),
    // Cool bounce answering the key from the opposite quadrant.
    blob(fillAt, r.accentAlt, a(0.16) * (dark ? 0.34 : 0.6), 84, 66),
    // Specular bloom along the light axis.
    sweep(dark ? 205 : 335, tint, a(0.1) * 0.8),
  );

  // Photographic finish on every sheet: a soft directional grade so the
  // composition has a light source, and a whisper of edge falloff so nothing
  // ends flat at the frame.
  L.push(grade(dark ? 200 : 340, tint, r.accent, a(0.08)));
  L.push(vignette(dark ? "#000000" : r.ink, (dark ? 0.22 : 0.05) * (0.5 + g * 0.5)));


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
  // An author-chosen background section is encoded into the seed as
  // `scene:<name>` so the pack's `ground(seed)` contract stays unchanged while
  // the per-slide pick wins over the deterministic mapping below.
  const explicit = /scene:([a-z]+)/.exec(s);
  if (explicit && (SKIN_SCENES as string[]).includes(explicit[1]!)) {
    return explicit[1] as SkinScene;
  }
  // An exact section name is authoritative — the fuzzy tests below would read
  // "agenda" as a closing slide (it contains "end").
  if ((SKIN_SCENES as string[]).includes(s)) return s as SkinScene;
  if (/cover|title|hero|opening/.test(s)) return "cover";
  if (/closing|thanks|\bend\b|cta|contact/.test(s)) return "closing";

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
