/**
 * STYLE PACKS — the alternate design directory.
 *
 * These are deliberately OFF-BRAND. Where `slide-skin.ts` holds the two
 * approved looks (Flagship 2026 and Enterprise White), this file holds a wide
 * spread of master design styles built purely for taste-testing in the public
 * module library: swap one dropdown and every module in the directory redresses
 * itself — page ground, ink, accent, typography, card treatment, corner
 * language, texture.
 *
 * The content never changes. Division knowledge, seeded copy, client walls and
 * stat figures all still come from the real system; only the dressing moves.
 * That is the point of the test: judge the look, not the words.
 *
 * HOW A PACK REACHES THE PIXELS
 * -----------------------------
 * A pack is not a fork of the renderer. It publishes CSS custom properties on
 * a wrapper element (`stylePackCssVars`) and the shared slide primitives read
 * those vars with a fallback to their current values:
 *
 *   background: var(--pack-card-bg, <existing flagship value>)
 *
 * So a pack that sets nothing renders exactly as today, and every module —
 * including ones written long before this file — picks the pack up for free.
 *
 * Backgrounds are procedural (layered CSS gradients + an SVG grain plate) so
 * switching packs is instant, prints cleanly, and costs no binary assets.
 */

export type StylePackId =
  | "swiss-noir"
  | "neo-brutal"
  | "editorial-serif"
  | "vapor-chrome"
  | "midnight-neon"
  | "desert-clay"
  | "blueprint-cyan"
  | "bauhaus-primary"
  | "sage-linen"
  | "graphite-chrome"
  /* extended set — each with its own signature motif (style-pack-motifs.ts) */
  | "atelier-lumen"
  | "onyx-couture"
  | "optic-moire"
  | "cyber-terminal"
  | "atlas-plate"
  | "riso-woodcut"
  | "quant-grid"
  | "retro-arcade"
  /* pattern-first set — built from tiling, collage and cut geometry, no washes */
  | "marble-aureate"
  | "azulejo-tile"
  | "comic-panel"
  | "basalt-mono"
  | "herbarium-press"
  | "deco-marquee";


export interface StylePackTokens {
  /** Page field. */
  surface: string;
  /** Primary reading ink. */
  ink: string;
  /** Secondary ink — eyebrows, meta, supporting copy. */
  inkMuted: string;
  /** Tertiary ink — footers, captions, page numbers. */
  inkFaint: string;
  /** Signature accent. Drives rules, ticks, figures, accent text. */
  accent: string;
  /** Accent used for text on the page field — contrast-safe version. */
  accentText: string;
  /** Secondary accent for grounds and second-order marks. */
  accentAlt: string;
  /** Action colour. */
  primary: string;
  /** Hairline rules. */
  hairline: string;
}

export interface StylePackCard {
  /** Card fill (may be a gradient). */
  bg: string;
  /** Full `border` shorthand. */
  border: string;
  /** Corner radius in px. 0 for brutalist / Swiss packs. */
  radius: number;
  /** Box shadow, or "none". */
  shadow: string;
  /** Backdrop filter, or "none". */
  blur: string;
}

export interface StylePackType {
  /** Display / headline stack. */
  display: string;
  /** Body stack. */
  body: string;
  /** Mono stack for kickers, meta and figures where the pack calls for it. */
  mono: string;
  /** Headline weight. */
  displayWeight: number;
  /** Headline tracking. */
  displayTracking: string;
  /** Headline case. */
  displayTransform: "none" | "uppercase";
  /** Headline optical scale multiplier — display faces sit at different heights. */
  displayScale: number;
  /** Kicker stack (falls back to mono or body per pack). */
  kicker: string;
  kickerWeight: number;
  kickerTracking: string;
}

export interface StylePack {
  id: StylePackId;
  label: string;
  /** One line for the directory card. */
  tagline: string;
  /** The reference the look is drawn from — helps reviewers name what they like. */
  reference: string;
  /** Native mode. Packs are single-mode by design: the mode IS the look. */
  mode: "light" | "dark";
  tokens: StylePackTokens;
  card: StylePackCard;
  type: StylePackType;
  /** Show the 2px full-bleed accent bar at the top of the page. */
  topBar: boolean;
  /** Grain plate opacity, 0 to disable. */
  grain: number;
  /** Ordered background layers, topmost first (CSS `background` order). */
  ground: (seed: string) => string[];
  /** Four hexes for the directory swatch. */
  swatch: string[];
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

function rgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic pick so a given module always gets the same variation. */
function pick<T>(seed: string, salt: number, list: T[]): T {
  return list[(hash(seed) + salt) % list.length]!;
}

function bloom(at: string, w: number, h: number, hex: string, a: number): string {
  return `radial-gradient(${w}% ${h}% at ${at}, ${rgba(hex, a)} 0%, ${rgba(hex, 0)} 72%)`;
}

function rules(hex: string, a: number, gap: number, axis: 0 | 90 = 0): string {
  return `repeating-linear-gradient(${axis}deg, ${rgba(hex, a)} 0px, ${rgba(hex, a)} 1px, transparent 1px, transparent ${gap}px)`;
}

function dots(hex: string, a: number, gap: number, r = 1.1): string {
  return `radial-gradient(${rgba(hex, a)} ${r}px, transparent ${r}px) 0 0 / ${gap}px ${gap}px repeat`;
}

function stripes(deg: number, hex: string, a: number, band: number): string {
  return `repeating-linear-gradient(${deg}deg, ${rgba(hex, a)} 0px, ${rgba(hex, a)} ${band}px, transparent ${band}px, transparent ${band * 2}px)`;
}

/** A block of flat colour occupying part of the sheet. */
function block(pos: string, w: string, h: string, hex: string, a = 1): string {
  return `linear-gradient(${rgba(hex, a)}, ${rgba(hex, a)}) ${pos} / ${w} ${h} no-repeat`;
}

/* ── hard-edge pattern vocabulary ────────────────────────────────────────
 * The extended packs are explicitly NOT required to use washes, blooms or
 * focus gradients. These helpers emit flat-ink SVG tiles and cut shapes so a
 * pack can be built out of pattern, tiling, collage and geometry instead.
 * ───────────────────────────────────────────────────────────────────────── */

function tileSvg(body: string, w: number, h: number): string {
  const doc = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' width='${w}' height='${h}'>${body}</svg>`;
  const enc = doc
    .replace(/#/g, "%23")
    .replace(/"/g, "'")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E");
  return `url("data:image/svg+xml;utf8,${enc}")`;
}

/** Repeating tile at a pixel size. */
function tile(body: string, w: number, h: number, size: number, pos = "0 0"): string {
  return `${tileSvg(body, w, h)} ${pos} / ${size}px ${(size * h) / w}px repeat`;
}

/** Full-bleed cut shape — no repeat, covers the sheet. */
function cut(body: string, pos = "center", size = "cover", w = 1440, h = 810): string {
  return `${tileSvg(body, w, h)} ${pos} / ${size} no-repeat`;
}

/** Flat field. No gradient ramp — one colour, edge to edge. */
function flat(hex: string, a = 1): string {
  return `linear-gradient(${rgba(hex, a)}, ${rgba(hex, a)})`;
}

/* -- tiles --
 *
 * De-tiling contract: a motif tile is a *material*, not wallpaper. Repeated
 * 10-15x across the sheet any figure reads as busy pattern and fights the
 * module content, so every figurative tile below is rendered at architectural
 * scale — roughly 2-4 repeats across a 1440px sheet — with its ink damped to
 * compensate for the extra mass each larger shape carries.
 *
 * Micro textures (halftone dot screens, crosshatch, dot grids, fine stripes)
 * are deliberately exempt: at 14-34px they read as paper grain, not tiling.
 */

/** Minimum on-sheet repeat size for a figurative motif tile. */
const MOTIF_MIN = 300;
/** How much to enlarge an authored motif size. */
const MOTIF_GAIN = 2.4;
/** Never so large the figure loses its identity as a repeat. */
const MOTIF_MAX = 620;

/** Scale a figurative tile up out of wallpaper territory. */
function motifSize(size: number): number {
  return Math.round(Math.min(MOTIF_MAX, Math.max(MOTIF_MIN, size * MOTIF_GAIN)));
}

/** Larger figures carry more ink, so damp alpha as scale grows. */
function motifAlpha(a: number, size: number): number {
  const growth = motifSize(size) / Math.max(size, 1);
  return Number((a / Math.max(1, growth * 0.62)).toFixed(4));
}



function checkers(hex: string, a: number, size: number): string {
  const A = motifAlpha(a, size);
  const S = motifSize(size);
  const c = rgba(hex, A);
  return tile(
    `<rect width='16' height='16' fill='none'/><rect width='8' height='8' fill='${c}'/><rect x='8' y='8' width='8' height='8' fill='${c}'/>`,
    16,
    16,
    S,
  );
}

function herringbone(hex: string, a: number, size: number): string {
  const A = motifAlpha(a, size);
  const S = motifSize(size);
  const c = rgba(hex, A);
  return tile(
    `<g fill='none' stroke='${c}' stroke-width='2.4'><path d='M0 16 L16 0 L32 16'/><path d='M0 48 L16 32 L32 48'/><path d='M-16 32 L0 16'/><path d='M32 16 L48 32'/></g>`,
    32,
    32,
    S,
  );
}

function chevron(hex: string, a: number, size: number): string {
  const A = motifAlpha(a, size);
  const S = motifSize(size);
  const c = rgba(hex, A);
  return tile(`<path d='M0 24 L16 0 L32 24 L32 32 L16 8 L0 32 Z' fill='${c}'/>`, 32, 32, S);
}

function scallop(hex: string, a: number, size: number): string {
  const A = motifAlpha(a, size);
  const S = motifSize(size);
  const c = rgba(hex, A);
  return tile(
    `<g fill='none' stroke='${c}' stroke-width='2'><path d='M0 24 A12 12 0 0 1 24 24'/><path d='M-12 12 A12 12 0 0 1 12 12'/><path d='M12 12 A12 12 0 0 1 36 12'/></g>`,
    24,
    24,
    S,
  );
}

function plaid(hex: string, alt: string, a: number, size: number): string {
  const A = motifAlpha(a, size);
  const S = motifSize(size);
  const c = rgba(hex, A);
  const d = rgba(alt, A * 0.8);
  return tile(
    `<rect x='0' y='0' width='48' height='6' fill='${c}'/><rect x='0' y='0' width='6' height='48' fill='${c}'/><rect x='24' y='0' width='2' height='48' fill='${d}'/><rect x='0' y='24' width='48' height='2' fill='${d}'/>`,
    48,
    48,
    S,
  );
}

function crosshatch(hex: string, a: number, size: number): string {
  const c = rgba(hex, a);
  return tile(
    `<g stroke='${c}' stroke-width='1.1'><path d='M0 0 L24 24'/><path d='M24 0 L0 24'/></g>`,
    24,
    24,
    size,
  );
}

function triangleGrid(hex: string, alt: string, a: number, size: number): string {
  const A = motifAlpha(a, size);
  const S = motifSize(size);
  const c = rgba(hex, A);
  const d = rgba(alt, A);
  return tile(
    `<path d='M0 0 L24 0 L0 24 Z' fill='${c}'/><path d='M24 0 L24 24 L0 24 Z' fill='${d}'/>`,
    24,
    24,
    S,
  );
}

function brick(hex: string, a: number, size: number): string {
  const A = motifAlpha(a, size);
  const S = motifSize(size);
  const c = rgba(hex, A);
  return tile(
    `<g fill='none' stroke='${c}' stroke-width='1.4'><rect x='0' y='0' width='48' height='16'/><rect x='24' y='16' width='48' height='16'/><rect x='-24' y='16' width='48' height='16'/></g>`,
    48,
    32,
    S,
  );
}

function zigzag(hex: string, a: number, size: number): string {
  const A = motifAlpha(a, size);
  const S = motifSize(size);
  const c = rgba(hex, A);
  return tile(
    `<path d='M0 20 L10 4 L20 20 L30 4 L40 20' fill='none' stroke='${c}' stroke-width='3'/>`,
    40,
    24,
    S,
  );
}

function confetti(hex: string, alt: string, a: number, size: number): string {
  const A = motifAlpha(a, size);
  const S = motifSize(size);
  const c = rgba(hex, A);
  const d = rgba(alt, A);
  return tile(
    `<rect x='6' y='10' width='10' height='3' rx='1.5' fill='${c}' transform='rotate(24 11 11)'/><rect x='40' y='34' width='10' height='3' rx='1.5' fill='${d}' transform='rotate(-38 45 35)'/><circle cx='52' cy='12' r='2.4' fill='${c}'/><circle cx='18' cy='46' r='2' fill='${d}'/><rect x='30' y='20' width='3' height='9' rx='1.5' fill='${d}'/>`,
    64,
    64,
    S,
  );
}

function azulejo(hex: string, alt: string, a: number, size: number): string {
  const A = motifAlpha(a, size);
  const S = motifSize(size);
  const c = rgba(hex, A);
  const d = rgba(alt, A * 0.9);
  return tile(
    `<rect width='64' height='64' fill='none'/><g stroke='${c}' stroke-width='2' fill='none'><path d='M32 4 L60 32 L32 60 L4 32 Z'/><path d='M32 18 L46 32 L32 46 L18 32 Z'/></g><circle cx='32' cy='32' r='4' fill='${d}'/><g fill='${d}'><circle cx='4' cy='4' r='3'/><circle cx='60' cy='4' r='3'/><circle cx='4' cy='60' r='3'/><circle cx='60' cy='60' r='3'/></g>`,
    64,
    64,
    S,
  );
}

function halftoneTile(hex: string, a: number, size: number): string {
  const c = rgba(hex, a);
  return tile(
    `<circle cx='6' cy='6' r='3.4' fill='${c}'/><circle cx='18' cy='18' r='1.6' fill='${c}'/>`,
    24,
    24,
    size,
  );
}

/* -- cuts (collage / colour-field geometry, hard edges only) -- */

/** Diagonal colour split across the sheet. */
function diagonalCut(hex: string, a: number, from: "tl" | "tr" = "tl"): string {
  const c = rgba(hex, a);
  const d = from === "tl" ? "M0 0 L1440 0 L0 810 Z" : "M1440 0 L1440 810 L0 0 Z";
  return cut(`<path d='${d}' fill='${c}'/>`);
}

/** Stack of flat horizontal bars of varying weight. */
function bandStack(hex: string, a: number, ys: number[]): string {
  const c = rgba(hex, a);
  const body = ys.map((y, i) => `<rect x='0' y='${y}' width='1440' height='${6 + i * 4}' fill='${c}'/>`).join("");
  return cut(body, "center", "100% 100%");
}

/** Concentric hard-edge rings — colour field, not a bloom. */
function rings(hex: string, a: number, cx: number, cy: number, count = 6): string {
  let body = "";
  for (let i = count; i >= 1; i--) {
    body += `<circle cx='${cx}' cy='${cy}' r='${i * 105}' fill='none' stroke='${rgba(hex, a)}' stroke-width='${i % 2 ? 26 : 12}'/>`;
  }
  return cut(body, "center", "cover");
}

/** Comic-style panel frame with a thick keyline. */
function panelFrame(hex: string, a: number): string {
  const c = rgba(hex, a);
  return cut(
    `<g fill='none' stroke='${c}' stroke-width='7'><rect x='34' y='34' width='1372' height='742'/></g><g fill='${c}'><rect x='34' y='34' width='420' height='7'/><rect x='34' y='34' width='7' height='210'/></g>`,
    "center",
    "100% 100%",
  );
}


/** Wedge fan of flat rays from one corner. */
function rayFan(hex: string, a: number, cx: number, cy: number): string {
  let body = "";
  for (let i = 0; i < 14; i += 2) {
    const a1 = (i / 14) * Math.PI - Math.PI / 2;
    const a2 = ((i + 1) / 14) * Math.PI - Math.PI / 2;
    const r = 2000;
    body += `<path d='M ${cx} ${cy} L ${cx + Math.cos(a1) * r} ${cy + Math.sin(a1) * r} L ${cx + Math.cos(a2) * r} ${cy + Math.sin(a2) * r} Z' fill='${rgba(hex, a)}'/>`;
  }
  return cut(body, "center", "cover");
}


/** Grain plate — shared tactile finish, tuned per pack via `grain`. */
export const GRAIN_PLATE =
  "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

/* ── the packs ───────────────────────────────────────────────────────────── */

const SANS = "'Inter', system-ui, sans-serif";

export const STYLE_PACKS: StylePack[] = [
  {
    id: "swiss-noir",
    label: "Swiss Noir",
    tagline: "Bone paper, black grotesque, one red cut. Grid you can feel.",
    reference: "Müller-Brockmann posters · Neue Haas · Josef Müller grid systems",
    mode: "light",
    tokens: {
      surface: "#F4F2ED",
      ink: "#101010",
      inkMuted: "#4A4A4A",
      inkFaint: "#8A8A85",
      accent: "#E3241B",
      accentText: "#C41C14",
      accentAlt: "#101010",
      primary: "#101010",
      hairline: "rgba(16,16,16,0.16)",
    },
    card: {
      bg: "#FFFFFF",
      border: "1px solid rgba(16,16,16,0.14)",
      radius: 0,
      shadow: "none",
      blur: "none",
    },
    type: {
      display: `'Archivo', ${SANS}`,
      body: `'Archivo', ${SANS}`,
      mono: `'JetBrains Mono', ui-monospace, monospace`,
      displayWeight: 700,
      displayTracking: "-0.035em",
      displayTransform: "none",
      displayScale: 1,
      kicker: `'JetBrains Mono', ui-monospace, monospace`,
      kickerWeight: 500,
      kickerTracking: "0.22em",
    },
    topBar: false,
    grain: 0.05,
    ground: (seed) => [
      block(pick(seed, 0, ["left top", "right top", "left bottom"]), "34%", "6px", "#E3241B"),
      rules("#101010", 0.05, 96, 90),
      rules("#101010", 0.05, 96),
      `linear-gradient(#F4F2ED, #F4F2ED)`,
    ],
    swatch: ["#F4F2ED", "#101010", "#E3241B", "#8A8A85"],
  },

  {
    id: "neo-brutal",
    label: "Neo Brutal",
    tagline: "Hard black outlines, offset shadows, one loud yellow.",
    reference: "Gumroad-era neo-brutalism · risograph zines · Memphis edges",
    mode: "light",
    tokens: {
      surface: "#FFFCF2",
      ink: "#0A0A0A",
      inkMuted: "#3D3A32",
      inkFaint: "#7A756A",
      accent: "#FF5722",
      accentText: "#D63B0C",
      accentAlt: "#FFD400",
      primary: "#0A0A0A",
      hairline: "rgba(10,10,10,0.9)",
    },
    card: {
      bg: "#FFFFFF",
      border: "3px solid #0A0A0A",
      radius: 4,
      shadow: "8px 8px 0 0 #0A0A0A",
      blur: "none",
    },
    type: {
      display: `'Archivo Black', ${SANS}`,
      body: `'Archivo', ${SANS}`,
      mono: `'Space Mono', ui-monospace, monospace`,
      displayWeight: 400,
      displayTracking: "-0.02em",
      displayTransform: "uppercase",
      displayScale: 0.9,
      kicker: `'Space Mono', ui-monospace, monospace`,
      kickerWeight: 700,
      kickerTracking: "0.16em",
    },
    topBar: true,
    grain: 0.06,
    ground: (seed) => [
      block("left bottom", "100%", "10px", "#0A0A0A"),
      block(pick(seed, 1, ["right top", "left top"]), "26%", "26%", "#FFD400", 0.85),
      stripes(45, "#0A0A0A", 0.05, 9),
      `linear-gradient(#FFFCF2, #FFF7E4)`,
    ],
    swatch: ["#FFFCF2", "#0A0A0A", "#FF5722", "#FFD400"],
  },

  {
    id: "editorial-serif",
    label: "Editorial Serif",
    tagline: "Cream stock, high-contrast serif display, terracotta rules.",
    reference: "Kinfolk · Monocle · long-form magazine openers",
    mode: "light",
    tokens: {
      surface: "#FBF7F0",
      ink: "#1E1A16",
      inkMuted: "#5B5248",
      inkFaint: "#9A9084",
      accent: "#C4654A",
      accentText: "#A44E36",
      accentAlt: "#4A6741",
      primary: "#1E1A16",
      hairline: "rgba(30,26,22,0.14)",
    },
    card: {
      bg: "linear-gradient(180deg, #FFFFFF 0%, #FBF6EE 100%)",
      border: "1px solid rgba(30,26,22,0.10)",
      radius: 2,
      shadow: "none",
      blur: "none",
    },
    type: {
      display: `'Instrument Serif', Georgia, serif`,
      body: `'Work Sans', ${SANS}`,
      mono: `'Space Mono', ui-monospace, monospace`,
      displayWeight: 400,
      displayTracking: "-0.015em",
      displayTransform: "none",
      displayScale: 1.08,
      kicker: `'Work Sans', ${SANS}`,
      kickerWeight: 600,
      kickerTracking: "0.26em",
    },
    topBar: false,
    grain: 0.07,
    ground: (seed) => [
      block("left top", "1px", "100%", "#C4654A", 0.35),
      bloom(pick(seed, 2, ["8% 92%", "92% 88%", "50% 104%"]), 46, 42, "#C4654A", 0.12),
      bloom("14% 12%", 40, 38, "#4A6741", 0.08),
      rules("#1E1A16", 0.035, 34),
      `linear-gradient(180deg, #FDFBF7 0%, #F7F1E6 100%)`,
    ],
    swatch: ["#FBF7F0", "#1E1A16", "#C4654A", "#4A6741"],
  },

  {
    id: "vapor-chrome",
    label: "Vapor Chrome",
    tagline: "Iridescent mesh, glassy tiles, Y2K optimism at 60% opacity.",
    reference: "Y2K chrome · holographic foil · early Apple aqua gradients",
    mode: "light",
    tokens: {
      surface: "#F3F1FF",
      ink: "#241B4A",
      inkMuted: "#544A82",
      inkFaint: "#8A82B8",
      accent: "#7C5CFF",
      accentText: "#5B3BE0",
      accentAlt: "#4ADEDE",
      primary: "#5B3BE0",
      hairline: "rgba(36,27,74,0.12)",
    },
    card: {
      bg: "linear-gradient(155deg, rgba(255,255,255,0.86) 0%, rgba(240,236,255,0.62) 100%)",
      border: "1px solid rgba(255,255,255,0.9)",
      radius: 28,
      shadow: "0 24px 60px -28px rgba(60,40,160,0.35), inset 0 1px 0 0 rgba(255,255,255,0.9)",
      blur: "blur(18px) saturate(160%)",
    },
    type: {
      display: `'Space Grotesk', ${SANS}`,
      body: `'DM Sans', ${SANS}`,
      mono: `'Space Mono', ui-monospace, monospace`,
      displayWeight: 500,
      displayTracking: "-0.03em",
      displayTransform: "none",
      displayScale: 1,
      kicker: `'Space Mono', ui-monospace, monospace`,
      kickerWeight: 500,
      kickerTracking: "0.2em",
    },
    topBar: false,
    grain: 0.04,
    ground: (seed) => [
      bloom(pick(seed, 3, ["16% 20%", "22% 80%", "50% 100%"]), 58, 56, "#4ADEDE", 0.4),
      bloom("84% 76%", 62, 58, "#FF9CE3", 0.3),
      bloom("50% 4%", 70, 40, "#7C5CFF", 0.26),
      `linear-gradient(155deg, #FFFFFF 0%, #EFECFF 46%, #E6F7FF 100%)`,
    ],
    swatch: ["#F3F1FF", "#7C5CFF", "#4ADEDE", "#FF9CE3"],
  },

  {
    id: "midnight-neon",
    label: "Midnight Neon",
    tagline: "Near-black field, mint signal, glow that reads as data.",
    reference: "Terminal UI · Bloomberg dark · synth-lab product pages",
    mode: "dark",
    tokens: {
      surface: "#070A12",
      ink: "#EAF3FF",
      inkMuted: "#93A6C4",
      inkFaint: "#5F718F",
      accent: "#2DD4A8",
      accentText: "#4CE9BE",
      accentAlt: "#73B7FF",
      primary: "#2DD4A8",
      hairline: "rgba(234,243,255,0.14)",
    },
    card: {
      bg: "linear-gradient(180deg, rgba(22,32,52,0.86) 0%, rgba(10,15,26,0.8) 100%)",
      border: "1px solid rgba(45,212,168,0.22)",
      radius: 10,
      shadow: "0 0 0 1px rgba(45,212,168,0.06), 0 30px 70px -40px rgba(45,212,168,0.4)",
      blur: "blur(10px)",
    },
    type: {
      display: `'Sora', ${SANS}`,
      body: `'Manrope', ${SANS}`,
      mono: `'JetBrains Mono', ui-monospace, monospace`,
      displayWeight: 600,
      displayTracking: "-0.035em",
      displayTransform: "none",
      displayScale: 0.96,
      kicker: `'JetBrains Mono', ui-monospace, monospace`,
      kickerWeight: 500,
      kickerTracking: "0.24em",
    },
    topBar: true,
    grain: 0.08,
    ground: (seed) => [
      bloom(pick(seed, 4, ["12% 88%", "50% 100%", "6% 40%"]), 58, 52, "#2DD4A8", 0.2),
      bloom("86% 92%", 52, 48, "#73B7FF", 0.16),
      rules("#EAF3FF", 0.035, 44, 90),
      rules("#EAF3FF", 0.035, 44),
      `linear-gradient(160deg, #0B1120 0%, #070A12 62%, #05070E 100%)`,
    ],
    swatch: ["#070A12", "#2DD4A8", "#73B7FF", "#EAF3FF"],
  },

  {
    id: "desert-clay",
    label: "Desert Clay",
    tagline: "Sandstone wash, clay accent, wide serif calm.",
    reference: "Southwestern architecture monographs · Aesop packaging",
    mode: "light",
    tokens: {
      surface: "#F7EFE4",
      ink: "#3A2A1E",
      inkMuted: "#6E5544",
      inkFaint: "#A08974",
      accent: "#C17C4A",
      accentText: "#A2602F",
      accentAlt: "#8B6F5E",
      primary: "#8B4A2B",
      hairline: "rgba(58,42,30,0.14)",
    },
    card: {
      bg: "linear-gradient(180deg, rgba(255,252,247,0.94) 0%, rgba(247,238,228,0.86) 100%)",
      border: "1px solid rgba(58,42,30,0.10)",
      radius: 18,
      shadow: "0 18px 40px -30px rgba(58,42,30,0.35)",
      blur: "none",
    },
    type: {
      display: `'Cormorant Garamond', Georgia, serif`,
      body: `'Karla', ${SANS}`,
      mono: `'Space Mono', ui-monospace, monospace`,
      displayWeight: 500,
      displayTracking: "-0.01em",
      displayTransform: "none",
      displayScale: 1.14,
      kicker: `'Karla', ${SANS}`,
      kickerWeight: 700,
      kickerTracking: "0.28em",
    },
    topBar: false,
    grain: 0.1,
    ground: (seed) => [
      bloom(pick(seed, 5, ["10% 14%", "12% 88%", "50% 104%"]), 52, 48, "#C17C4A", 0.22),
      bloom("86% 84%", 56, 50, "#8B6F5E", 0.18),
      stripes(0, "#3A2A1E", 0.025, 3),
      `linear-gradient(180deg, #FBF5EC 0%, #F2E6D6 100%)`,
    ],
    swatch: ["#F7EFE4", "#3A2A1E", "#C17C4A", "#8B6F5E"],
  },

  {
    id: "blueprint-cyan",
    label: "Blueprint Cyan",
    tagline: "Cyanotype field, measured grid, drafting ink.",
    reference: "Architectural cyanotypes · NASA technical plates",
    mode: "dark",
    tokens: {
      surface: "#0A2540",
      ink: "#E8F4FF",
      inkMuted: "#9CC2E0",
      inkFaint: "#6B93B5",
      accent: "#5CE1E6",
      accentText: "#8DF0F3",
      accentAlt: "#FFD166",
      primary: "#2E8FC8",
      hairline: "rgba(232,244,255,0.18)",
    },
    card: {
      bg: "linear-gradient(180deg, rgba(14,52,84,0.86) 0%, rgba(9,34,58,0.82) 100%)",
      border: "1px solid rgba(92,225,230,0.28)",
      radius: 0,
      shadow: "inset 0 0 0 1px rgba(232,244,255,0.05)",
      blur: "none",
    },
    type: {
      display: `'Jura', ${SANS}`,
      body: `'IBM Plex Sans', ${SANS}`,
      mono: `'IBM Plex Mono', ui-monospace, monospace`,
      displayWeight: 500,
      displayTracking: "0.01em",
      displayTransform: "uppercase",
      displayScale: 0.9,
      kicker: `'IBM Plex Mono', ui-monospace, monospace`,
      kickerWeight: 500,
      kickerTracking: "0.3em",
    },
    topBar: false,
    grain: 0.07,
    ground: (seed) => [
      block(pick(seed, 6, ["left top", "right top"]), "3px", "100%", "#5CE1E6", 0.5),
      rules("#E8F4FF", 0.09, 108, 90),
      rules("#E8F4FF", 0.09, 108),
      rules("#E8F4FF", 0.035, 27, 90),
      rules("#E8F4FF", 0.035, 27),
      bloom("50% 50%", 70, 66, "#2E8FC8", 0.28),
      `linear-gradient(160deg, #0C2C4C 0%, #0A2540 60%, #071B2F 100%)`,
    ],
    swatch: ["#0A2540", "#5CE1E6", "#FFD166", "#E8F4FF"],
  },

  {
    id: "bauhaus-primary",
    label: "Bauhaus Primary",
    tagline: "Primary blocks, circle-and-bar geometry, condensed caps.",
    reference: "Dessau workshop posters · Herbert Bayer · Vkhutemas",
    mode: "light",
    tokens: {
      surface: "#F2EFE6",
      ink: "#141414",
      inkMuted: "#454545",
      inkFaint: "#82806F",
      accent: "#D8232A",
      accentText: "#B81C22",
      accentAlt: "#1B4EA0",
      primary: "#1B4EA0",
      hairline: "rgba(20,20,20,0.18)",
    },
    card: {
      bg: "#FFFDF7",
      border: "2px solid #141414",
      radius: 0,
      shadow: "none",
      blur: "none",
    },
    type: {
      display: `'Bebas Neue', ${SANS}`,
      body: `'Barlow', ${SANS}`,
      mono: `'Space Mono', ui-monospace, monospace`,
      displayWeight: 400,
      displayTracking: "0.01em",
      displayTransform: "uppercase",
      displayScale: 1.16,
      kicker: `'Barlow', ${SANS}`,
      kickerWeight: 700,
      kickerTracking: "0.24em",
    },
    topBar: true,
    grain: 0.05,
    ground: (seed) => [
      `radial-gradient(circle at ${pick(seed, 7, ["8% 90%", "90% 88%", "50% 104%"])}, ${rgba("#FFC20E", 0.9)} 0 92px, transparent 92px)`,
      block("left bottom", "18%", "12px", "#1B4EA0"),
      block("right top", "12px", "22%", "#D8232A"),
      rules("#141414", 0.04, 120, 90),
      `linear-gradient(#F4F1E8, #EFEADD)`,
    ],
    swatch: ["#F2EFE6", "#D8232A", "#1B4EA0", "#FFC20E"],
  },

  {
    id: "sage-linen",
    label: "Sage Linen",
    tagline: "Linen field, sage rules, unhurried humanist type.",
    reference: "Wellness studio identities · Japanese photobook margins",
    mode: "light",
    tokens: {
      surface: "#F5F2E9",
      ink: "#26302A",
      inkMuted: "#54604F",
      inkFaint: "#8D9887",
      accent: "#7D9B76",
      accentText: "#5C7B55",
      accentAlt: "#C9BFA6",
      primary: "#4A6741",
      hairline: "rgba(38,48,42,0.13)",
    },
    card: {
      bg: "linear-gradient(180deg, rgba(255,255,252,0.95) 0%, rgba(243,240,231,0.9) 100%)",
      border: "1px solid rgba(38,48,42,0.08)",
      radius: 20,
      shadow: "0 20px 44px -34px rgba(38,48,42,0.35)",
      blur: "none",
    },
    type: {
      display: `'Lora', Georgia, serif`,
      body: `'Nunito Sans', ${SANS}`,
      mono: `'Space Mono', ui-monospace, monospace`,
      displayWeight: 500,
      displayTracking: "-0.012em",
      displayTransform: "none",
      displayScale: 1.02,
      kicker: `'Nunito Sans', ${SANS}`,
      kickerWeight: 700,
      kickerTracking: "0.3em",
    },
    topBar: false,
    grain: 0.12,
    ground: (seed) => [
      bloom(pick(seed, 8, ["14% 86%", "50% 96%", "8% 46%"]), 54, 50, "#7D9B76", 0.2),
      bloom("90% 90%", 46, 44, "#C9BFA6", 0.28),
      stripes(90, "#26302A", 0.02, 2),
      stripes(0, "#26302A", 0.02, 2),
      `linear-gradient(180deg, #FAF8F1 0%, #F1EDE1 100%)`,
    ],
    swatch: ["#F5F2E9", "#26302A", "#7D9B76", "#C9BFA6"],
  },

  {
    id: "graphite-chrome",
    label: "Graphite Chrome",
    tagline: "Milled graphite, silver hairlines, precision-instrument type.",
    reference: "Braun / Rams product plates · Leica engraving · hi-fi faceplates",
    mode: "dark",
    tokens: {
      surface: "#17181B",
      ink: "#F2F3F5",
      inkMuted: "#A9ADB5",
      inkFaint: "#75797F",
      accent: "#E8B44A",
      accentText: "#F0C670",
      accentAlt: "#C9CED6",
      primary: "#C9CED6",
      hairline: "rgba(242,243,245,0.16)",
    },
    card: {
      bg: "linear-gradient(180deg, rgba(46,48,53,0.9) 0%, rgba(28,30,34,0.9) 100%)",
      border: "1px solid rgba(242,243,245,0.12)",
      radius: 6,
      shadow: "inset 0 1px 0 0 rgba(255,255,255,0.08), 0 26px 60px -40px rgba(0,0,0,0.9)",
      blur: "none",
    },
    type: {
      display: `'Outfit', ${SANS}`,
      body: `'Figtree', ${SANS}`,
      mono: `'JetBrains Mono', ui-monospace, monospace`,
      displayWeight: 300,
      displayTracking: "-0.03em",
      displayTransform: "none",
      displayScale: 1.04,
      kicker: `'JetBrains Mono', ui-monospace, monospace`,
      kickerWeight: 400,
      kickerTracking: "0.32em",
    },
    topBar: false,
    grain: 0.09,
    ground: (seed) => [
      block(pick(seed, 9, ["left top", "left bottom"]), "100%", "1px", "#E8B44A", 0.45),
      stripes(90, "#FFFFFF", 0.014, 2),
      bloom("50% 0%", 80, 44, "#C9CED6", 0.1),
      bloom("14% 92%", 52, 46, "#E8B44A", 0.08),
      `linear-gradient(170deg, #23252A 0%, #17181B 58%, #101114 100%)`,
    ],
    swatch: ["#17181B", "#E8B44A", "#C9CED6", "#F2F3F5"],
  },

  /* ── extended set ───────────────────────────────────────────────────────
     Six further masters, each built around its own signature gesture rather
     than a recolour of the ten above: gallery arcs, couture pleats, optical
     moiré, circuit traces, cartographic contours, woodcut grain, a quant data
     ladder, and an arcade perspective floor. Grounds here are deliberately
     asymmetric — a pack should be recognisable from its silhouette alone.
     ──────────────────────────────────────────────────────────────────────── */

  {
    id: "atelier-lumen",
    label: "Atelier Lumen",
    tagline: "Alabaster gallery wall, raking daylight, one brass hairline.",
    reference: "Zumthor Kunsthaus interiors · Hermès window schemes · Phaidon monographs",
    mode: "light",
    tokens: {
      surface: "#F7F5F1",
      ink: "#17191C",
      inkMuted: "#4B5057",
      inkFaint: "#868C93",
      accent: "#A6803C",
      accentText: "#7E5F26",
      accentAlt: "#2C3A44",
      primary: "#17191C",
      hairline: "rgba(23,25,28,0.12)",
    },
    card: {
      bg: "linear-gradient(180deg, #FFFFFF 0%, #F4F1EB 100%)",
      border: "1px solid rgba(23,25,28,0.07)",
      radius: 2,
      shadow: "0 30px 60px -46px rgba(23,25,28,0.28)",
      blur: "none",
    },
    type: {
      display: `'Instrument Serif', Georgia, serif`,
      body: `'Work Sans', ${SANS}`,
      mono: `'JetBrains Mono', ui-monospace, monospace`,
      displayWeight: 400,
      displayTracking: "-0.012em",
      displayTransform: "none",
      displayScale: 1.16,
      kicker: `'JetBrains Mono', ui-monospace, monospace`,
      kickerWeight: 500,
      kickerTracking: "0.34em",
    },
    topBar: false,
    grain: 0.05,
    /* Strategy: one brass datum line, one raking light source, nothing else.
     * The sheet is a lit wall — the module is the object hung on it. */
    ground: (seed) => [
      block(pick(seed, 12, ["left top 22%", "left bottom 24%"]), "38%", "1px", "#A6803C", 0.55),
      bloom(pick(seed, 5, ["12% 6%", "88% 8%"]), 76, 60, "#FFFFFF", 0.7),
      bloom("50% 112%", 96, 46, "#2C3A44", 0.06),
      `linear-gradient(168deg, #FBFAF7 0%, #F7F5F1 54%, #EDEAE3 100%)`,
    ],
    swatch: ["#F7F5F1", "#17191C", "#A6803C", "#2C3A44"],
  },

  {
    id: "onyx-couture",
    label: "Onyx Couture",
    tagline: "Onyx ground, champagne foil rule, couture serif at scale.",
    reference: "Maison runway invitations · Céline lookbooks · Fabien Baron layouts",
    mode: "dark",
    tokens: {
      surface: "#0B0B0D",
      ink: "#F4F1EA",
      inkMuted: "#B4AEA3",
      inkFaint: "#7E766A",
      accent: "#D9C08A",
      accentText: "#E7D3A6",
      accentAlt: "#8E7F6A",
      primary: "#D9C08A",
      hairline: "rgba(244,241,234,0.14)",
    },
    card: {
      bg: "linear-gradient(180deg, rgba(24,24,27,0.94) 0%, rgba(13,13,15,0.94) 100%)",
      border: "1px solid rgba(217,192,138,0.20)",
      radius: 1,
      shadow: "0 34px 80px -52px rgba(0,0,0,0.95)",
      blur: "none",
    },
    type: {
      display: `'Cormorant Garamond', Georgia, serif`,
      body: `'Karla', ${SANS}`,
      mono: `'JetBrains Mono', ui-monospace, monospace`,
      displayWeight: 400,
      displayTracking: "0.004em",
      displayTransform: "none",
      displayScale: 1.24,
      kicker: `'JetBrains Mono', ui-monospace, monospace`,
      kickerWeight: 400,
      kickerTracking: "0.42em",
    },
    topBar: false,
    grain: 0.04,
    /* Strategy: a single foil rule as the couture margin, one low spotlight
     * from the footer. The page stays black so type and product read first. */
    ground: (seed) => [
      block(pick(seed, 9, ["left 96px top", "right 96px top"]), "1px", "100%", "#D9C08A", 0.30),
      block("left bottom", "100%", "2px", "#D9C08A", 0.22),
      bloom("50% 116%", 92, 52, "#D9C08A", 0.07),
      bloom(pick(seed, 6, ["10% 4%", "90% 6%"]), 66, 48, "#F4F1EA", 0.04),
      `linear-gradient(170deg, #131316 0%, #0B0B0D 56%, #070709 100%)`,
    ],
    swatch: ["#0B0B0D", "#F4F1EA", "#D9C08A", "#8E7F6A"],
  },


  {
    id: "optic-moire",
    label: "Optic Moiré",
    tagline: "Pure white, black interference rings, one electric blue.",
    reference: "Vera Molnár · Bridget Riley op-art · early plotter prints",
    mode: "light",
    tokens: {
      surface: "#FFFFFF",
      ink: "#0B0B0B",
      inkMuted: "#3F3F3F",
      inkFaint: "#8C8C8C",
      accent: "#1B4DFF",
      accentText: "#1339D6",
      accentAlt: "#0B0B0B",
      primary: "#0B0B0B",
      hairline: "rgba(11,11,11,0.18)",
    },
    card: {
      bg: "rgba(255,255,255,0.9)",
      border: "1px solid #0B0B0B",
      radius: 0,
      shadow: "none",
      blur: "blur(4px)",
    },
    type: {
      display: `'Space Grotesk', ${SANS}`,
      body: `'DM Sans', ${SANS}`,
      mono: `'Space Mono', ui-monospace, monospace`,
      displayWeight: 500,
      displayTracking: "-0.045em",
      displayTransform: "none",
      displayScale: 1.02,
      kicker: `'Space Mono', ui-monospace, monospace`,
      kickerWeight: 400,
      kickerTracking: "0.3em",
    },
    topBar: true,
    grain: 0,
    ground: (seed) => [
      block(pick(seed, 13, ["left top", "right bottom"]), "8px", "38%", "#1B4DFF"),
      rings("#0B0B0B", 0.05, pick(seed, 13, [1320, 120]), 700, 7),
      checkers("#0B0B0B", 0.045, 132),
      flat("#FFFFFF"),
    ],
    swatch: ["#FFFFFF", "#0B0B0B", "#1B4DFF", "#8C8C8C"],
  },

  {
    id: "cyber-terminal",
    label: "Signal Room",
    tagline: "Graphite instrument bay, machined rails, one cold cyan signal.",
    reference:
      "Braun/Dieter Rams instrument faces · Teenage Engineering panels · SR-71 cockpit placards",
    mode: "dark",
    tokens: {
      surface: "#0E1113",
      ink: "#ECEFF1",
      inkMuted: "#A3ACB2",
      inkFaint: "#6B757B",
      accent: "#5AD2D2",
      accentText: "#8FE3E3",
      accentAlt: "#E08A3C",
      primary: "#5AD2D2",
      hairline: "rgba(236,239,241,0.13)",
    },
    card: {
      bg: "linear-gradient(180deg, rgba(28,33,36,0.92) 0%, rgba(17,21,23,0.94) 100%)",
      border: "1px solid rgba(236,239,241,0.10)",
      radius: 3,
      shadow: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 18px 40px -28px rgba(0,0,0,0.9)",
      blur: "none",
    },
    type: {
      display: `'Inter Tight', ${SANS}`,
      body: `'IBM Plex Sans', ${SANS}`,
      mono: `'IBM Plex Mono', ui-monospace, monospace`,
      displayWeight: 600,
      displayTracking: "-0.03em",
      displayTransform: "none",
      displayScale: 1,
      kicker: `'IBM Plex Mono', ui-monospace, monospace`,
      kickerWeight: 500,
      kickerTracking: "0.3em",
    },
    topBar: true,
    grain: 0.05,
    /* Quiet bay: content sits on clean graphite. Structure is pushed to the
     * extreme edges so nothing competes with a module's own cards. */
    ground: (seed) => [
      /* machined rail — one edge only, thin */
      block(pick(seed, 14, ["left top", "right top"]), "2px", "100%", "#5AD2D2", 0.3),
      /* placard tick strip along the very bottom margin */
      block("left bottom", "100%", "1px", "#ECEFF1", 0.09),
      /* panel light: single soft source, far corner, low alpha */
      bloom(pick(seed, 6, ["6% 94%", "94% 96%"]), 74, 60, "#5AD2D2", 0.05),
      bloom("50% 120%", 100, 46, "#000000", 0.28),
      `linear-gradient(172deg, #14181B 0%, #0E1113 52%, #0A0D0F 100%)`,
    ],
    swatch: ["#0E1113", "#ECEFF1", "#5AD2D2", "#E08A3C"],
  },


  {
    id: "atlas-plate",
    label: "Atlas Plate",
    tagline: "Deep survey navy, contour engraving, brass annotation.",
    reference: "Admiralty charts · National Geographic plates · USGS engraving",
    mode: "dark",
    tokens: {
      surface: "#0A1A24",
      ink: "#F1EDE2",
      inkMuted: "#A9B7BF",
      inkFaint: "#6F8189",
      accent: "#D8A94B",
      accentText: "#E7BE69",
      accentAlt: "#5FA8A0",
      primary: "#D8A94B",
      hairline: "rgba(241,237,226,0.16)",
    },
    card: {
      bg: "linear-gradient(180deg, rgba(18,40,52,0.9) 0%, rgba(10,26,36,0.92) 100%)",
      border: "1px solid rgba(216,169,75,0.22)",
      radius: 3,
      shadow: "0 30px 70px -46px rgba(0,0,0,0.9)",
      blur: "none",
    },
    type: {
      display: `'Libre Baskerville', Georgia, serif`,
      body: `'IBM Plex Sans', ${SANS}`,
      mono: `'IBM Plex Mono', ui-monospace, monospace`,
      displayWeight: 400,
      displayTracking: "-0.01em",
      displayTransform: "none",
      displayScale: 1,
      kicker: `'IBM Plex Mono', ui-monospace, monospace`,
      kickerWeight: 500,
      kickerTracking: "0.3em",
    },
    topBar: false,
    grain: 0.1,
    ground: (seed) => [
      block(pick(seed, 15, ["left top", "left bottom"]), "3px", "100%", "#D8A94B", 0.5),
      panelFrame("#D8A94B", 0.16),
      plaid("#5FA8A0", "#D8A94B", 0.07, 210),
      flat("#0A1A24"),
    ],
    swatch: ["#0A1A24", "#D8A94B", "#5FA8A0", "#F1EDE2"],
  },

  {
    id: "riso-woodcut",
    label: "Riso Woodcut",
    tagline: "Plank grain, two-ink riso overprint, cut-block titles.",
    reference: "Woodblock broadsides · risograph gig posters · WPA prints",
    mode: "light",
    tokens: {
      surface: "#F2EAD9",
      ink: "#1F1A14",
      inkMuted: "#544A3B",
      inkFaint: "#8B7F6C",
      accent: "#1F6F5C",
      accentText: "#175748",
      accentAlt: "#D2452F",
      primary: "#1F1A14",
      hairline: "rgba(31,26,20,0.16)",
    },
    card: {
      bg: "linear-gradient(180deg, #FBF6EA 0%, #F0E6D2 100%)",
      border: "2px solid rgba(31,26,20,0.85)",
      radius: 0,
      shadow: "5px 5px 0 0 rgba(31,26,20,0.16)",
      blur: "none",
    },
    type: {
      display: `'Bebas Neue', ${SANS}`,
      body: `'Barlow', ${SANS}`,
      mono: `'Space Mono', ui-monospace, monospace`,
      displayWeight: 400,
      displayTracking: "0.01em",
      displayTransform: "uppercase",
      displayScale: 1.2,
      kicker: `'Barlow', ${SANS}`,
      kickerWeight: 600,
      kickerTracking: "0.24em",
    },
    topBar: false,
    grain: 0.12,
    ground: (seed) => [
      block(pick(seed, 16, ["left top", "right top"]), "40%", "12px", "#D2452F", 0.85),
      halftoneTile("#D2452F", 0.16, 26),
      stripes(90, "#1F1A14", 0.03, 6),
      diagonalCut("#1F6F5C", 0.06, pick(seed, 16, ["tl", "tr"])),
      flat("#F2EAD9"),
    ],
    swatch: ["#F2EAD9", "#1F6F5C", "#D2452F", "#1F1A14"],
  },

  {
    id: "quant-grid",
    label: "Quant Grid",
    tagline: "Terminal slate, tabular figures, magenta signal.",
    reference: "Bloomberg terminals · trading desks · FT data pages",
    mode: "dark",
    tokens: {
      surface: "#0E1116",
      ink: "#E9EEF5",
      inkMuted: "#9AA6B6",
      inkFaint: "#697588",
      accent: "#FF2D8A",
      accentText: "#FF63A8",
      accentAlt: "#33D6FF",
      primary: "#FF2D8A",
      hairline: "rgba(233,238,245,0.14)",
    },
    card: {
      bg: "linear-gradient(180deg, rgba(24,29,38,0.92) 0%, rgba(14,17,22,0.94) 100%)",
      border: "1px solid rgba(233,238,245,0.1)",
      radius: 4,
      shadow: "0 24px 56px -40px rgba(0,0,0,0.95)",
      blur: "none",
    },
    type: {
      display: `'Archivo', ${SANS}`,
      body: `'IBM Plex Sans', ${SANS}`,
      mono: `'IBM Plex Mono', ui-monospace, monospace`,
      displayWeight: 600,
      displayTracking: "-0.04em",
      displayTransform: "none",
      displayScale: 0.96,
      kicker: `'IBM Plex Mono', ui-monospace, monospace`,
      kickerWeight: 500,
      kickerTracking: "0.28em",
    },
    topBar: true,
    grain: 0.05,
    ground: (seed) => [
      rules("#E9EEF5", 0.03, 72, 90),
      rules("#E9EEF5", 0.02, 72),
      bandStack("#33D6FF", 0.06, pick(seed, 17, [[612, 668, 724], [86, 150, 214]])),
      triangleGrid("#FF2D8A", "#33D6FF", 0.05, 96),
      flat("#0E1116"),
    ],
    swatch: ["#0E1116", "#FF2D8A", "#33D6FF", "#E9EEF5"],
  },

  {
    id: "retro-arcade",
    label: "Retro Arcade",
    tagline: "Violet night, perspective floor, sunset scanlines.",
    reference: "Outrun cabinet art · 80s arcade attract screens · synth sleeves",
    mode: "dark",
    tokens: {
      surface: "#180B2E",
      ink: "#FFF3FB",
      inkMuted: "#C6A8E8",
      inkFaint: "#8E71B8",
      accent: "#FF4D9D",
      accentText: "#FF7FB8",
      accentAlt: "#41E8FF",
      primary: "#FF4D9D",
      hairline: "rgba(255,243,251,0.18)",
    },
    card: {
      bg: "linear-gradient(180deg, rgba(48,20,84,0.86) 0%, rgba(24,11,46,0.9) 100%)",
      border: "1px solid rgba(65,232,255,0.28)",
      radius: 10,
      shadow: "0 0 48px -24px rgba(255,77,157,0.6)",
      blur: "blur(2px)",
    },
    type: {
      display: `'Tektur', ${SANS}`,
      body: `'Rubik', ${SANS}`,
      mono: `'Space Mono', ui-monospace, monospace`,
      displayWeight: 600,
      displayTracking: "-0.01em",
      displayTransform: "uppercase",
      displayScale: 0.9,
      kicker: `'Space Mono', ui-monospace, monospace`,
      kickerWeight: 700,
      kickerTracking: "0.3em",
    },
    topBar: true,
    grain: 0.06,
    ground: (seed) => [
      rules("#FFF3FB", 0.035, 3),
      chevron("#41E8FF", 0.07, 120),
      rayFan("#FF4D9D", 0.09, pick(seed, 18, [200, 1240]), 860),
      flat("#180B2E"),
    ],
    swatch: ["#180B2E", "#FF4D9D", "#41E8FF", "#FFF3FB"],
  },

  /* ── pattern-first set ──────────────────────────────────────────────────
   * These packs deliberately avoid gradient washes and focus blooms: the page
   * is built from flat colour, tiled pattern, cut shapes and keylines.
   * ─────────────────────────────────────────────────────────────────────── */

  {
    id: "marble-aureate",
    label: "Marble Aureate",
    tagline: "Honed carrara, a single vein, antique gold annotation.",
    reference: "Museo del Novecento signage · Bulgari print · Massimo Vignelli marble suites",
    mode: "light",
    tokens: {
      surface: "#F2F1EE",
      ink: "#1B1D22",
      inkMuted: "#4E535B",
      inkFaint: "#888D95",
      accent: "#B08A46",
      accentText: "#87692F",
      accentAlt: "#54606B",
      primary: "#1B1D22",
      hairline: "rgba(27,29,34,0.13)",
    },
    card: {
      bg: "linear-gradient(180deg, #FFFFFF 0%, #EFEEEA 100%)",
      border: "1px solid rgba(27,29,34,0.08)",
      radius: 2,
      shadow: "0 28px 58px -44px rgba(27,29,34,0.3)",
      blur: "none",
    },
    type: {
      display: `'Libre Baskerville', Georgia, serif`,
      body: `'IBM Plex Sans', ${SANS}`,
      mono: `'IBM Plex Mono', ui-monospace, monospace`,
      displayWeight: 400,
      displayTracking: "-0.015em",
      displayTransform: "none",
      displayScale: 1.02,
      kicker: `'IBM Plex Mono', ui-monospace, monospace`,
      kickerWeight: 500,
      kickerTracking: "0.32em",
    },
    topBar: false,
    grain: 0.06,
    /* Strategy: stone as a quiet plane. One gold datum, one cool shadow at the
     * far edge; the vein itself is the signature motif, kept to one field. */
    ground: (seed) => [
      block(pick(seed, 15, ["right top 26%", "right bottom 28%"]), "34%", "1px", "#B08A46", 0.55),
      bloom(pick(seed, 8, ["94% 8%", "6% 10%"]), 64, 52, "#FFFFFF", 0.65),
      bloom("50% 114%", 94, 44, "#54606B", 0.06),
      `linear-gradient(166deg, #F8F7F5 0%, #F2F1EE 54%, #E7E6E1 100%)`,
    ],
    swatch: ["#F2F1EE", "#1B1D22", "#B08A46", "#54606B"],
  },

  {
    id: "azulejo-tile",
    label: "Azulejo Tile",
    tagline: "Cobalt tilework, whitewash plaster, glazed medallions.",
    reference: "Lisbon azulejos · Delftware · Andalusian courtyards",
    mode: "light",
    tokens: {
      surface: "#F4F7FA",
      ink: "#10243F",
      inkMuted: "#3C5674",
      inkFaint: "#7C90A6",
      accent: "#1B57A8",
      accentText: "#14498F",
      accentAlt: "#C9962F",
      primary: "#1B57A8",
      hairline: "rgba(16,36,63,0.16)",
    },
    card: {
      bg: "#FFFFFF",
      border: "1px solid rgba(27,87,168,0.26)",
      radius: 0,
      shadow: "none",
      blur: "none",
    },
    type: {
      display: `'Cormorant Garamond', Georgia, serif`,
      body: `'Karla', ${SANS}`,
      mono: `'IBM Plex Mono', ui-monospace, monospace`,
      displayWeight: 600,
      displayTracking: "-0.01em",
      displayTransform: "none",
      displayScale: 1.06,
      kicker: `'Karla', ${SANS}`,
      kickerWeight: 700,
      kickerTracking: "0.26em",
    },
    topBar: false,
    grain: 0.04,
    ground: (seed) => [
      block(pick(seed, 22, ["left bottom", "right bottom"]), "100%", "26%", "#1B57A8", 0.06),
      azulejo("#1B57A8", "#C9962F", 0.22, 128),
      flat("#F4F7FA"),
    ],
    swatch: ["#F4F7FA", "#1B57A8", "#C9962F", "#10243F"],
  },

  {
    id: "comic-panel",
    label: "Comic Panel",
    tagline: "Thick keylines, benday dots, speed-line bursts.",
    reference: "Silver-age comics · Lichtenstein plates · manga screentone",
    mode: "light",
    tokens: {
      surface: "#FFFDF4",
      ink: "#0B0B0B",
      inkMuted: "#33312C",
      inkFaint: "#7B776D",
      accent: "#E01B2E",
      accentText: "#BE1526",
      accentAlt: "#1B54E0",
      primary: "#E01B2E",
      hairline: "rgba(11,11,11,0.9)",
    },
    card: {
      bg: "#FFFFFF",
      border: "3px solid #0B0B0B",
      radius: 0,
      shadow: "7px 7px 0 #0B0B0B",
      blur: "none",
    },
    type: {
      display: `'Archivo Black', ${SANS}`,
      body: `'Hind', ${SANS}`,
      mono: `'Space Mono', ui-monospace, monospace`,
      displayWeight: 900,
      displayTracking: "-0.02em",
      displayTransform: "uppercase",
      displayScale: 0.92,
      kicker: `'Space Mono', ui-monospace, monospace`,
      kickerWeight: 700,
      kickerTracking: "0.3em",
    },
    topBar: false,
    grain: 0.04,
    ground: (seed) => [
      panelFrame("#0B0B0B", 0.9),
      rayFan("#E01B2E", 0.1, pick(seed, 23, [1300, 140]), -40),
      halftoneTile("#1B54E0", 0.14, 20),
      flat("#FFFDF4"),
    ],
    swatch: ["#FFFDF4", "#0B0B0B", "#E01B2E", "#1B54E0"],
  },

  {
    id: "basalt-mono",
    label: "Basalt Mono",
    tagline: "Cooled basalt, pewter type, one ember seam near the base.",
    reference: "Vitsœ catalogues · Aesop store cards · Herzog & de Meuron material boards",
    mode: "dark",
    tokens: {
      surface: "#17191A",
      ink: "#EDEFEF",
      inkMuted: "#A9B1B4",
      inkFaint: "#798285",
      accent: "#D2643C",
      accentText: "#E68A63",
      accentAlt: "#9FA7AB",
      primary: "#D2643C",
      hairline: "rgba(237,239,239,0.12)",
    },
    card: {
      bg: "linear-gradient(180deg, rgba(35,38,39,0.92) 0%, rgba(21,23,24,0.94) 100%)",
      border: "1px solid rgba(237,239,239,0.09)",
      radius: 4,
      shadow: "0 30px 66px -46px rgba(0,0,0,0.9)",
      blur: "none",
    },
    type: {
      display: `'Sora', ${SANS}`,
      body: `'Manrope', ${SANS}`,
      mono: `'IBM Plex Mono', ui-monospace, monospace`,
      displayWeight: 300,
      displayTracking: "-0.03em",
      displayTransform: "none",
      displayScale: 1.06,
      kicker: `'IBM Plex Mono', ui-monospace, monospace`,
      kickerWeight: 500,
      kickerTracking: "0.3em",
    },
    topBar: false,
    grain: 0.05,
    /* Strategy: material honesty. One ember seam low on the sheet, one cold
     * pewter wash high, and a wide quiet middle where the module lives. */
    ground: (seed) => [
      block(pick(seed, 17, ["left bottom 18%", "left bottom 26%"]), "46%", "2px", "#D2643C", 0.5),
      bloom(pick(seed, 4, ["8% 8%", "92% 10%"]), 70, 52, "#9FA7AB", 0.07),
      bloom("50% 118%", 96, 50, "#D2643C", 0.05),
      `linear-gradient(172deg, #1E2122 0%, #17191A 56%, #101213 100%)`,
    ],
    swatch: ["#17191A", "#EDEFEF", "#D2643C", "#9FA7AB"],
  },

  {
    id: "herbarium-press",
    label: "Herbarium Press",
    tagline: "Pressed-specimen sheet, botanical silhouettes, sepia labels.",
    reference: "Victorian herbaria · Kew plates · specimen mount cards",
    mode: "light",
    tokens: {
      surface: "#F3EFE3",
      ink: "#25301F",
      inkMuted: "#4E5B44",
      inkFaint: "#8A9179",
      accent: "#4E7A43",
      accentText: "#3C6234",
      accentAlt: "#9A6B3A",
      primary: "#4E7A43",
      hairline: "rgba(37,48,31,0.18)",
    },
    card: {
      bg: "#FBF8EF",
      border: "1px solid rgba(37,48,31,0.22)",
      radius: 1,
      shadow: "none",
      blur: "none",
    },
    type: {
      display: `'Libre Baskerville', Georgia, serif`,
      body: `'IBM Plex Sans', ${SANS}`,
      mono: `'IBM Plex Mono', ui-monospace, monospace`,
      displayWeight: 700,
      displayTracking: "-0.012em",
      displayTransform: "none",
      displayScale: 0.96,
      kicker: `'IBM Plex Mono', ui-monospace, monospace`,
      kickerWeight: 500,
      kickerTracking: "0.3em",
    },
    topBar: false,
    grain: 0.07,
    ground: (seed) => [
      panelFrame("#25301F", 0.14),
      scallop("#4E7A43", 0.09, 74),
      block(pick(seed, 25, ["left bottom", "right bottom"]), "34%", "5px", "#9A6B3A", 0.6),
      flat("#F3EFE3"),
    ],
    swatch: ["#F3EFE3", "#4E7A43", "#9A6B3A", "#25301F"],
  },

  {
    id: "deco-marquee",
    label: "Deco Marquee",
    tagline: "Stepped arches, brass inlay, oxblood field.",
    reference: "Chrysler lobby metalwork · Poiret posters · theatre marquees",
    mode: "dark",
    tokens: {
      surface: "#25121B",
      ink: "#F7EBDB",
      inkMuted: "#CDAF9A",
      inkFaint: "#9A7D6C",
      accent: "#D9A24B",
      accentText: "#E8C68A",
      accentAlt: "#7CA8A0",
      primary: "#D9A24B",
      hairline: "rgba(247,235,219,0.2)",
    },
    card: {
      bg: "rgba(52,24,34,0.9)",
      border: "1px solid rgba(217,162,75,0.34)",
      radius: 0,
      shadow: "none",
      blur: "none",
    },
    type: {
      display: `'Poiret One', 'Archivo', ${SANS}`,
      body: `'Karla', ${SANS}`,
      mono: `'Space Mono', ui-monospace, monospace`,
      displayWeight: 400,
      displayTracking: "0.06em",
      displayTransform: "uppercase",
      displayScale: 1.04,
      kicker: `'Karla', ${SANS}`,
      kickerWeight: 700,
      kickerTracking: "0.34em",
    },
    topBar: true,
    grain: 0.06,
    ground: (seed) => [
      chevron("#D9A24B", 0.1, 96),
      bandStack("#D9A24B", 0.14, pick(seed, 26, [[36, 60, 84], [700, 724, 748]])),
      herringbone("#7CA8A0", 0.06, 120),
      flat("#25121B"),
    ],
    swatch: ["#25121B", "#D9A24B", "#7CA8A0", "#F7EBDB"],
  },
];


export const STYLE_PACK_IDS = STYLE_PACKS.map((p) => p.id);

export function stylePackById(id: string | null | undefined): StylePack | null {
  if (!id) return null;
  return STYLE_PACKS.find((p) => p.id === id) ?? null;
}

/* ── page layout designs, per composition ────────────────────────────────
 * A pack is not one background. Every module type gets its own PAGE LAYOUT:
 * a cover is cut differently from a stat wall, a data page, a quote spread or
 * a closing plate. These scaffolds are built from the pack's own tokens with
 * hard-edge geometry (blocks, bands, frames, gutters, plinths, tick rails) so
 * the design language stays the pack's while the composition changes per page.
 *
 * Layers returned here sit ON TOP of the pack's base ground (CSS `background`
 * lists paint first-to-last, front-to-back), so the ground still reads as the
 * pack's field and the scaffold structures the page.
 * ───────────────────────────────────────────────────────────────────────── */

export type PackComposition =
  | "cover"
  | "statement"
  | "grid"
  | "editorial"
  | "media"
  | "data"
  | "quote"
  | "closing";

const COMPOSITION_RULES: Array<[RegExp, PackComposition]> = [
  [/COVER|TITLE|OPENER|HERO/i, "cover"],
  [/CLOSE|CLOSING|CTA|THANK|NEXT-STEP|CONTACT/i, "closing"],
  [/QUOTE|TESTIMON|INS-|VOICE/i, "quote"],
  [/KPI|VIZ|CHART|DASH|GRAPH|METRIC|TREND/i, "data"],
  [/STAT|PROOF|NUMBER|RESULT|OUTCOME/i, "statement"],
  [/PHOTO|MEDIA|IMAGE|PORTRAIT|GALLERY/i, "media"],
  [/BENTO|GRID|MATRIX|PILLAR|WALL|LOGO|TILE|CARD/i, "grid"],
  [/ED-|EDITORIAL|NARRATIVE|STORY|LETTER|QUOTE-LONG/i, "editorial"],
];

/** Which page layout a module should be dressed in. */
export function packCompositionFor(
  variantId: string | null | undefined,
  layoutId?: string | null,
): PackComposition {
  const key = `${variantId ?? ""} ${layoutId ?? ""}`;
  for (const [re, comp] of COMPOSITION_RULES) if (re.test(key)) return comp;
  return "editorial";
}

/** Vertical gutter rail — structures column-based pages. */
function gutters(hex: string, a: number, count: number): string {
  const step = 1440 / count;
  let body = "";
  for (let i = 1; i < count; i++) {
    body += `<rect x='${i * step - 0.6}' y='0' width='1.2' height='810' fill='${rgba(hex, a)}'/>`;
  }
  return cut(body, "center", "100% 100%");
}

/** Short tick rail along one edge — measurement language. */
function tickRail(hex: string, a: number, edge: "top" | "bottom" | "left"): string {
  let body = "";
  if (edge === "left") {
    for (let y = 40; y < 810; y += 45) {
      body += `<rect x='0' y='${y}' width='${y % 90 === 40 ? 26 : 14}' height='1.6' fill='${rgba(hex, a)}'/>`;
    }
  } else {
    const y = edge === "top" ? 0 : 810 - 26;
    for (let x = 40; x < 1440; x += 45) {
      body += `<rect x='${x}' y='${y}' width='1.6' height='${x % 90 === 40 ? 26 : 14}' fill='${rgba(hex, a)}'/>`;
    }
  }
  return cut(body, "center", "100% 100%");
}

/** Inset mat frame — editorial margin. */
function mat(hex: string, a: number, inset: number, w = 2): string {
  return cut(
    `<rect x='${inset}' y='${inset}' width='${1440 - inset * 2}' height='${810 - inset * 2}' fill='none' stroke='${rgba(hex, a)}' stroke-width='${w}'/>`,
    "center",
    "100% 100%",
  );
}

/** Oversized quotation mark cut out of flat ink. */
function quoteMark(hex: string, a: number, x: number, y: number, s: number): string {
  const c = rgba(hex, a);
  return cut(
    `<g fill='${c}' transform='translate(${x} ${y}) scale(${s})'><path d='M0 60 C0 20 26 0 62 0 L62 26 C40 26 30 36 30 54 L62 54 L62 120 L0 120 Z'/><path d='M86 60 C86 20 112 0 148 0 L148 26 C126 26 116 36 116 54 L148 54 L148 120 L86 120 Z'/></g>`,
    "center",
    "100% 100%",
  );
}

/** Plot field for data pages: baseline + faint horizontal reference lines. */
function plotField(hex: string, a: number): string {
  let body = "";
  for (let i = 1; i <= 4; i++) {
    body += `<rect x='96' y='${180 + i * 116}' width='1248' height='1' fill='${rgba(hex, a * 0.7)}'/>`;
  }
  body += `<rect x='96' y='644' width='1248' height='2.6' fill='${rgba(hex, a * 2)}'/>`;
  body += `<rect x='96' y='180' width='2.6' height='466' fill='${rgba(hex, a * 2)}'/>`;
  return cut(body, "center", "100% 100%");
}

/* ── top-right vocabulary ────────────────────────────────────────────────
 * Design review: the alternate packs were all repeating the same filled
 * quadrant block up in the top-right, which read as a soft "image cube" —
 * a corporate/enterprise gesture. Blurred quadrant blooms now belong ONLY
 * to the division/enterprise sheets (SlideChrome backdrop layers). Packs get
 * drawn, hard-edged corner devices instead, chosen by pack personality.
 * ───────────────────────────────────────────────────────────────────────── */

/** Open right-angle bracket in the top-right margin — framing, not filling. */
function cornerBracket(hex: string, a: number, len = 132, w = 2): string {
  const c = rgba(hex, a);
  return cut(
    `<g fill='${c}'><rect x='${1440 - 56 - len}' y='56' width='${len}' height='${w}'/><rect x='${1440 - 56 - w}' y='56' width='${w}' height='${len}'/></g>`,
    "center",
    "100% 100%",
  );
}

/** Stacked hairlines stepping in from the top-right corner — editorial index. */
function staffLines(hex: string, a: number, count = 5): string {
  let body = "";
  for (let i = 0; i < count; i++) {
    const w = 220 - i * 34;
    body += `<rect x='${1440 - 64 - w}' y='${64 + i * 15}' width='${w}' height='1.4' fill='${rgba(hex, a * (1 - i * 0.12))}'/>`;
  }
  return cut(body, "center", "100% 100%");
}

/** Small measured notch cluster — instrument/placard language. */
function notchCluster(hex: string, a: number): string {
  let body = "";
  for (let i = 0; i < 9; i++) {
    const h = i % 3 === 0 ? 22 : 11;
    body += `<rect x='${1440 - 64 - i * 18}' y='60' width='1.8' height='${h}' fill='${rgba(hex, a)}'/>`;
  }
  body += `<rect x='${1440 - 224}' y='60' width='160' height='1.4' fill='${rgba(hex, a * 0.7)}'/>`;
  return cut(body, "center", "100% 100%");
}

/** Outline circle + crosshair — registration mark. */
function registerMark(hex: string, a: number): string {
  const c = rgba(hex, a);
  return cut(
    `<g stroke='${c}' stroke-width='1.6' fill='none'><circle cx='1348' cy='108' r='34'/><path d='M1348 60 V156 M1300 108 H1396'/></g>`,
    "center",
    "100% 100%",
  );
}

/** Thin outline square rotated off-axis — geometric, empty, no fill. */
function tiltedOutline(hex: string, a: number): string {
  return cut(
    `<rect x='1272' y='52' width='104' height='104' fill='none' stroke='${rgba(hex, a)}' stroke-width='1.8' transform='rotate(12 1324 104)'/>`,
    "center",
    "100% 100%",
  );
}

/** Stepped ziggurat of thin rules — deco / arcade cadence. */
function stepRule(hex: string, a: number): string {
  let body = "";
  for (let i = 0; i < 5; i++) {
    body += `<rect x='${1440 - 60 - (i + 1) * 30}' y='${58 + i * 18}' width='${(i + 1) * 30}' height='2' fill='${rgba(hex, a * (1 - i * 0.1))}'/>`;
  }
  return cut(body, "center", "100% 100%");
}

/**
 * The pack's own top-right device. Deterministic per pack id so a look keeps
 * one consistent corner signature across every module in the set.
 */
function topRightDevice(pack: StylePack, a: number): string {
  const t = pack.tokens;
  const devices = [
    () => cornerBracket(t.accent, a * 1.5),
    () => staffLines(t.ink, a * 1.7),
    () => notchCluster(t.ink, a * 1.8),
    () => registerMark(t.accentAlt, a * 1.7),
    () => tiltedOutline(t.accent, a * 1.6),
    () => stepRule(t.accentAlt, a * 1.6),
  ];
  return devices[hash(pack.id) % devices.length]!();
}



/**
 * The page layout scaffold for a pack in a given composition. Seed rotates the
 * arrangement so sibling modules of the same type still differ.
 */
export function packLayoutLayers(
  pack: StylePack,
  comp: PackComposition,
  seed: string,
): string[] {
  const t = pack.tokens;
  // Design review: the scaffold is structure, not decoration. Hard-edged packs
  // still carry more weight, but the whole plane sits a step back so the ground
  // and the motif can read as separate layers instead of one loud sheet.
  const bold = pack.card.radius === 0 ? 0.72 : 0.58;
  const A = (n: number) => n * bold;

  // Design direction: no wallpaper. The scaffold is a small number of edge
  // bands, one margin device, and nothing tiled — no gutters, tick rails,
  // crosshatch, plot fields or diagonal cross-cuts.
  switch (comp) {
    case "cover":
      return [
        block(pick(seed, 1, ["left bottom", "right bottom"]), "38%", "12px", t.accent, 0.9),
        topRightDevice(pack, A(0.26)),
        block("left top", "100%", "2px", t.ink, A(0.26)),
      ];

    case "statement":
      return [
        block("left top", "100%", "5px", t.accent, 0.88),
        block("left bottom", "100%", "30%", t.accentAlt, A(0.09)),
        topRightDevice(pack, A(0.2)),
      ];

    case "grid":
      return [
        block("left top", "8px", "100%", t.accent, 0.85),
        block("right bottom", "100%", "6px", t.accentAlt, A(0.34)),
        topRightDevice(pack, A(0.18)),
      ];

    case "editorial":
      return [
        mat(t.ink, A(0.18), 44, 1.2),
        block(pick(seed, 5, ["left top", "left bottom"]), "5px", "48%", t.accent, 0.85),
        topRightDevice(pack, A(0.22)),
      ];

    case "media":
      return [
        block("left bottom", "100%", "26%", t.ink, A(0.14)),
        topRightDevice(pack, A(0.24)),
        mat(t.ink, A(0.14), 26, 1),
      ];

    case "data":
      return [
        block("left top", "20%", "6px", t.accent, 0.9),
        block("left bottom", "100%", "2px", t.ink, A(0.24)),
        topRightDevice(pack, A(0.18)),
      ];


    case "quote":
      return [
        quoteMark(t.accent, A(0.18), pick(seed, 7, [86, 1090]), 96, pick(seed, 8, [2.4, 3])),
        block("left top", "10px", "100%", t.accent, 0.85),
        block("right bottom", "46%", "5px", t.accentAlt, A(0.4)),
      ];

    case "closing":
      return [
        block("left bottom", "100%", "14px", t.accent, 0.9),
        topRightDevice(pack, A(0.22)),
      ];
  }
}

/* ── minimal pack sheet ──────────────────────────────────────────────────
 * The alternate looks keep their palette, type and corner devices, but not
 * patterned wallpaper: tiled SVG motifs, ruled/striped repeats and dot
 * fields are dropped so every sheet reads modern and near-minimal. Flat
 * fields, soft washes and drawn edge structure survive.
 * ───────────────────────────────────────────────────────────────────────── */
export function minimalPackLayers(layers: string[]): string[] {
  return layers.filter((l) => {
    if (/repeating-(linear|radial)-gradient/.test(l)) return false;
    // tiled backgrounds: an explicit `repeat` keyword with a tile size
    if (/\brepeat\b/.test(l) && !/no-repeat/.test(l)) return false;
    return true;
  });
}


/** Joined `background` shorthand for a pack on a given module seed. */
export function stylePackGround(
  pack: StylePack,
  seed: string,
  comp: PackComposition = "editorial",
): string {
  return [...packLayoutLayers(pack, comp, seed), ...pack.ground(seed)].join(", ");
}

/* ── the layering contract ───────────────────────────────────────────────
 * Design review outcome. A pack sheet is painted in four discrete planes,
 * back to front, and each plane owns exactly one job:
 *
 *   1. FIELD     flat token surface. Never patterned. Guarantees the page
 *                colour is exact and the same on every module.
 *   2. GROUND    the pack's washes, rules and tiles — damped, and feathered
 *                away from the optical centre so copy never sits on pattern.
 *   3. SCAFFOLD  page-layout structure per composition (bands, gutters,
 *                mats, tick rails). Crisp, thin, unmasked.
 *   4. MOTIF     one signature gesture, zoned (see style-pack-motifs).
 *
 * Keeping these apart is what makes 24 different looks feel like one library:
 * the personality changes, the layering discipline does not.
 * ───────────────────────────────────────────────────────────────────────── */

/** Plane 1 — the flat page field. */
export function packField(pack: StylePack): string {
  return pack.tokens.surface;
}

/**
 * Plane 2 mask — clears the reading core. Covers and quote spreads carry copy
 * lower/left, so the quiet pocket moves with the composition.
 */
export function packGroundMask(comp: PackComposition): string {
  switch (comp) {
    case "cover":
      return "radial-gradient(112% 96% at 14% 78%, transparent 0%, transparent 34%, #000 76%)";
    case "quote":
      return "radial-gradient(104% 92% at 50% 50%, transparent 0%, transparent 40%, #000 80%)";
    case "statement":
    case "data":
      return "radial-gradient(122% 104% at 50% 54%, transparent 0%, transparent 36%, #000 78%)";
    case "media":
      return "radial-gradient(126% 116% at 50% 40%, transparent 0%, transparent 44%, #000 86%)";
    default:
      return "radial-gradient(120% 108% at 50% 48%, transparent 0%, transparent 38%, #000 80%)";
  }
}

/**
 * Plane 2 level. Pattern-first packs published the loudest grounds, so they get
 * pulled back hardest; wash-based packs need less correction.
 */
export function packGroundOpacity(pack: StylePack): number {
  const PATTERN_FIRST: StylePackId[] = [
    "azulejo-tile",
    "comic-panel",
    "herbarium-press",
    "deco-marquee",
    "optic-moire",
    "retro-arcade",
    "neo-brutal",
    "riso-woodcut",
    "quant-grid",
    "blueprint-cyan",
  ];
  return PATTERN_FIRST.includes(pack.id) ? 0.42 : 0.68;
}


/**
 * The CSS custom properties a pack publishes. Applied to a wrapper around the
 * slide; every primitive reads these with a fallback, so packs are additive.
 */
export function stylePackCssVars(pack: StylePack): Record<string, string> {
  const t = pack.tokens;
  const c = pack.card;
  const ty = pack.type;
  return {
    "--pack-surface": t.surface,
    "--pack-ink": t.ink,
    "--pack-ink-muted": t.inkMuted,
    "--pack-ink-faint": t.inkFaint,
    "--pack-accent": t.accent,
    "--pack-accent-text": t.accentText,
    "--pack-accent-alt": t.accentAlt,
    "--pack-primary": t.primary,
    "--pack-hairline": t.hairline,
    "--pack-card-bg": c.bg,
    "--pack-card-border": c.border,
    "--pack-card-radius": `${c.radius}px`,
    "--pack-card-shadow": c.shadow,
    "--pack-card-blur": c.blur,
    "--pack-display": ty.display,
    "--pack-body": ty.body,
    "--pack-mono": ty.mono,
    "--pack-display-weight": String(ty.displayWeight),
    "--pack-display-tracking": ty.displayTracking,
    "--pack-display-transform": ty.displayTransform,
    "--pack-display-scale": String(ty.displayScale),
    "--pack-kicker": ty.kicker,
    "--pack-kicker-weight": String(ty.kickerWeight),
    "--pack-kicker-tracking": ty.kickerTracking,
    // Emphasis face + ink for editorial titles. Without these the brand's navy
    // italic serif leaked into every pack's cover, which the review flagged as
    // the single biggest break in the alternate looks.
    "--pack-emphasis": ty.display,
    "--pack-emphasis-ink": t.accentText,

  };
}

/**
 * Re-tone a brand mode into the pack's palette.
 *
 * Modules paint hundreds of accent-driven marks inline (step numerals, icon
 * chips, rules, figure counterforms) from `brand.tokens`. Design review found
 * these still rendering in TransPerfect navy on every alternate look — a blue
 * "01" on a terracotta sheet, blue icons on a sumi scroll. Swapping the tokens
 * at the source fixes all of them at once, and keeps the pack coherent.
 *
 * Content, division knowledge and copy are untouched: only colour moves.
 */
export function packToneBrand<
  T extends { tokens: { primary: string; accent: string; surface: string; ink: string } },
>(brand: T, pack: StylePack | null | undefined): T {
  if (!pack) return brand;
  return {
    ...brand,
    tokens: {
      primary: pack.tokens.primary,
      accent: pack.tokens.accentText,
      surface: pack.tokens.surface,
      ink: pack.tokens.ink,
    },
  };
}
