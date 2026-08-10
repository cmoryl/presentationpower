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
  | "ink-sumi"
  | "terrazzo-studio"
  | "optic-moire"
  | "cyber-terminal"
  | "atlas-plate"
  | "riso-woodcut"
  | "quant-grid"
  | "retro-arcade"
  /* pattern-first set — built from tiling, collage and cut geometry, no washes */
  | "quilt-folk"
  | "azulejo-tile"
  | "comic-panel"
  | "xerox-punk"
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

/* -- tiles -- */

function checkers(hex: string, a: number, size: number): string {
  const c = rgba(hex, a);
  return tile(
    `<rect width='16' height='16' fill='none'/><rect width='8' height='8' fill='${c}'/><rect x='8' y='8' width='8' height='8' fill='${c}'/>`,
    16,
    16,
    size,
  );
}

function herringbone(hex: string, a: number, size: number): string {
  const c = rgba(hex, a);
  return tile(
    `<g fill='none' stroke='${c}' stroke-width='2.4'><path d='M0 16 L16 0 L32 16'/><path d='M0 48 L16 32 L32 48'/><path d='M-16 32 L0 16'/><path d='M32 16 L48 32'/></g>`,
    32,
    32,
    size,
  );
}

function chevron(hex: string, a: number, size: number): string {
  const c = rgba(hex, a);
  return tile(`<path d='M0 24 L16 0 L32 24 L32 32 L16 8 L0 32 Z' fill='${c}'/>`, 32, 32, size);
}

function scallop(hex: string, a: number, size: number): string {
  const c = rgba(hex, a);
  return tile(
    `<g fill='none' stroke='${c}' stroke-width='2'><path d='M0 24 A12 12 0 0 1 24 24'/><path d='M-12 12 A12 12 0 0 1 12 12'/><path d='M12 12 A12 12 0 0 1 36 12'/></g>`,
    24,
    24,
    size,
  );
}

function plaid(hex: string, alt: string, a: number, size: number): string {
  const c = rgba(hex, a);
  const d = rgba(alt, a * 0.8);
  return tile(
    `<rect x='0' y='0' width='48' height='6' fill='${c}'/><rect x='0' y='0' width='6' height='48' fill='${c}'/><rect x='24' y='0' width='2' height='48' fill='${d}'/><rect x='0' y='24' width='48' height='2' fill='${d}'/>`,
    48,
    48,
    size,
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
  const c = rgba(hex, a);
  const d = rgba(alt, a);
  return tile(
    `<path d='M0 0 L24 0 L0 24 Z' fill='${c}'/><path d='M24 0 L24 24 L0 24 Z' fill='${d}'/>`,
    24,
    24,
    size,
  );
}

function quilt(hex: string, alt: string, a: number, size: number): string {
  const c = rgba(hex, a);
  const d = rgba(alt, a);
  return tile(
    `<rect width='32' height='32' fill='none'/><path d='M16 0 L32 16 L16 32 L0 16 Z' fill='${c}'/><circle cx='16' cy='16' r='4' fill='${d}'/><path d='M0 0 L6 0 L0 6 Z M32 0 L26 0 L32 6 Z M0 32 L0 26 L6 32 Z M32 32 L26 32 L32 26 Z' fill='${d}'/>`,
    32,
    32,
    size,
  );
}

function brick(hex: string, a: number, size: number): string {
  const c = rgba(hex, a);
  return tile(
    `<g fill='none' stroke='${c}' stroke-width='1.4'><rect x='0' y='0' width='48' height='16'/><rect x='24' y='16' width='48' height='16'/><rect x='-24' y='16' width='48' height='16'/></g>`,
    48,
    32,
    size,
  );
}

function zigzag(hex: string, a: number, size: number): string {
  const c = rgba(hex, a);
  return tile(
    `<path d='M0 20 L10 4 L20 20 L30 4 L40 20' fill='none' stroke='${c}' stroke-width='3'/>`,
    40,
    24,
    size,
  );
}

function confetti(hex: string, alt: string, a: number, size: number): string {
  const c = rgba(hex, a);
  const d = rgba(alt, a);
  return tile(
    `<rect x='6' y='10' width='10' height='3' rx='1.5' fill='${c}' transform='rotate(24 11 11)'/><rect x='40' y='34' width='10' height='3' rx='1.5' fill='${d}' transform='rotate(-38 45 35)'/><circle cx='52' cy='12' r='2.4' fill='${c}'/><circle cx='18' cy='46' r='2' fill='${d}'/><rect x='30' y='20' width='3' height='9' rx='1.5' fill='${d}'/>`,
    64,
    64,
    size,
  );
}

function azulejo(hex: string, alt: string, a: number, size: number): string {
  const c = rgba(hex, a);
  const d = rgba(alt, a * 0.9);
  return tile(
    `<rect width='64' height='64' fill='none'/><g stroke='${c}' stroke-width='2' fill='none'><path d='M32 4 L60 32 L32 60 L4 32 Z'/><path d='M32 18 L46 32 L32 46 L18 32 Z'/></g><circle cx='32' cy='32' r='4' fill='${d}'/><g fill='${d}'><circle cx='4' cy='4' r='3'/><circle cx='60' cy='4' r='3'/><circle cx='4' cy='60' r='3'/><circle cx='60' cy='60' r='3'/></g>`,
    64,
    64,
    size,
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

/** Torn / cut paper edge band along one side. */
function tornBand(hex: string, a: number, side: "top" | "bottom" = "bottom"): string {
  const c = rgba(hex, a);
  const pts =
    side === "bottom"
      ? "M0 810 L0 690 L120 712 L260 676 L410 706 L560 664 L720 700 L880 662 L1030 702 L1180 668 L1320 704 L1440 674 L1440 810 Z"
      : "M0 0 L1440 0 L1440 132 L1320 104 L1180 142 L1030 106 L880 146 L720 108 L560 148 L410 110 L260 150 L120 112 L0 146 Z";
  return cut(`<path d='${pts}' fill='${c}'/>`, "center", "100% 100%");
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
      bloom(pick(seed, 2, ["88% 8%", "8% 92%", "92% 88%"]), 46, 42, "#C4654A", 0.12),
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
      bloom(pick(seed, 3, ["16% 20%", "80% 18%", "22% 80%"]), 58, 56, "#4ADEDE", 0.4),
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
      bloom(pick(seed, 4, ["12% 88%", "88% 12%", "50% 100%"]), 58, 52, "#2DD4A8", 0.2),
      bloom("82% 18%", 52, 48, "#73B7FF", 0.16),
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
      bloom(pick(seed, 5, ["10% 14%", "90% 16%", "12% 88%"]), 52, 48, "#C17C4A", 0.22),
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
      `radial-gradient(circle at ${pick(seed, 7, ["92% 12%", "8% 90%", "90% 88%"])}, ${rgba("#FFC20E", 0.9)} 0 92px, transparent 92px)`,
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
      bloom(pick(seed, 8, ["14% 86%", "86% 14%", "50% 96%"]), 54, 50, "#7D9B76", 0.2),
      bloom("88% 20%", 46, 44, "#C9BFA6", 0.28),
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
     Eight further masters, each built around its own signature motif rather
     than a recolour of the ten above: brush gesture, terrazzo chips, optical
     moiré, circuit traces, cartographic contours, woodcut grain, a quant data
     ladder, and an arcade perspective floor. Grounds here are deliberately
     asymmetric — a pack should be recognisable from its silhouette alone.
     ──────────────────────────────────────────────────────────────────────── */

  {
    id: "ink-sumi",
    label: "Sumi Scroll",
    tagline: "Kozo paper, one loaded brush, a single vermilion seal.",
    reference:
      "Hasegawa Tōhaku pine screens · Kōhei Sugiura book design · Nakajima washi editions",
    mode: "light",
    tokens: {
      surface: "#EFEAE0",
      ink: "#14110F",
      inkMuted: "#463F39",
      inkFaint: "#8A8177",
      accent: "#C1352A",
      accentText: "#9E2A20",
      accentAlt: "#22384C",
      primary: "#14110F",
      hairline: "rgba(20,17,15,0.14)",
    },
    card: {
      bg: "linear-gradient(180deg, rgba(255,253,248,0.94) 0%, rgba(239,234,224,0.86) 100%)",
      border: "1px solid rgba(20,17,15,0.10)",
      radius: 0,
      shadow: "none",
      blur: "none",
    },
    type: {
      display: `'Cormorant Garamond', Georgia, serif`,
      body: `'Karla', ${SANS}`,
      mono: `'Space Mono', ui-monospace, monospace`,
      displayWeight: 300,
      displayTracking: "0.005em",
      displayTransform: "none",
      displayScale: 1.2,
      kicker: `'Space Mono', ui-monospace, monospace`,
      kickerWeight: 400,
      kickerTracking: "0.4em",
    },
    topBar: false,
    grain: 0.13,
    ground: (seed) => [
      /* hanko seal — small, deliberate, never centred */
      block(
        pick(seed, 11, ["right 72px top 56px", "right 72px bottom 64px"]),
        "40px",
        "40px",
        "#C1352A",
        0.92,
      ),
      /* scroll mounting rules — one thin vertical margin line */
      block(pick(seed, 7, ["left 104px top", "right 104px top"]), "1px", "100%", "#14110F", 0.16),
      /* kozo fibre tooth */
      rules("#14110F", 0.035, 7, 90),
      /* two soft ink washes, tuned to opposite corners */
      bloom(pick(seed, 5, ["18% 12%", "82% 16%"]), 70, 58, "#22384C", 0.07),
      bloom("50% 108%", 90, 52, "#14110F", 0.06),
      `linear-gradient(168deg, #F4F0E8 0%, #EFEAE0 46%, #E6E0D4 100%)`,
    ],
    swatch: ["#EFEAE0", "#14110F", "#C1352A", "#22384C"],
  },

  {
    id: "terrazzo-studio",
    label: "Terrazzo Atelier",
    tagline: "Poured travertine, hand-graded chips, verdigris and sienna.",
    reference:
      "Palazzo Milanese seminato floors · Carlo Scarpa Olivetti terrazzo · Dimore Studio interiors",
    mode: "light",
    tokens: {
      surface: "#F1ECE3",
      ink: "#211D19",
      inkMuted: "#544C43",
      inkFaint: "#8C8377",
      accent: "#B4522F",
      accentText: "#973F21",
      accentAlt: "#2E6B60",
      primary: "#211D19",
      hairline: "rgba(33,29,25,0.14)",
    },
    card: {
      bg: "linear-gradient(180deg, #FDFBF7 0%, #F4EFE6 100%)",
      border: "1px solid rgba(33,29,25,0.09)",
      radius: 3,
      shadow: "0 26px 52px -40px rgba(33,29,25,0.34)",
      blur: "none",
    },
    type: {
      display: `'Instrument Serif', Georgia, serif`,
      body: `'Work Sans', ${SANS}`,
      mono: `'JetBrains Mono', ui-monospace, monospace`,
      displayWeight: 400,
      displayTracking: "-0.01em",
      displayTransform: "none",
      displayScale: 1.14,
      kicker: `'JetBrains Mono', ui-monospace, monospace`,
      kickerWeight: 500,
      kickerTransform: "uppercase",
      kickerTracking: "0.3em",
    },
    topBar: false,
    grain: 0.09,
    ground: (seed) => [
      /* brass divider strip — the seminato expansion joint */
      block(pick(seed, 12, ["left top 34%", "left bottom 34%"]), "100%", "2px", "#B4522F", 0.5),
      /* poured slab tonal shift, quarry-cut not gradient-soft */
      block(pick(seed, 3, ["left bottom", "right bottom"]), "44%", "38%", "#2E6B60", 0.07),
      rules("#211D19", 0.03, 5, 90),
      `linear-gradient(172deg, #F7F3EB 0%, #F1ECE3 52%, #E7E0D3 100%)`,
    ],
    swatch: ["#F1ECE3", "#B4522F", "#2E6B60", "#211D19"],
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
    label: "Cyber Terminal",
    tagline: "Board-green substrate, etched traces, phosphor lime type.",
    reference: "CRT terminals · PCB silkscreen · Blade Runner readouts",
    mode: "dark",
    tokens: {
      surface: "#07120E",
      ink: "#DFFFE9",
      inkMuted: "#8CC7A4",
      inkFaint: "#5A8C6E",
      accent: "#4DFF9E",
      accentText: "#7BFFB8",
      accentAlt: "#1FBFA8",
      primary: "#4DFF9E",
      hairline: "rgba(77,255,158,0.2)",
    },
    card: {
      bg: "linear-gradient(180deg, rgba(15,38,29,0.86) 0%, rgba(7,18,14,0.9) 100%)",
      border: "1px solid rgba(77,255,158,0.24)",
      radius: 2,
      shadow: "inset 0 0 0 1px rgba(77,255,158,0.06), 0 0 42px -22px rgba(77,255,158,0.5)",
      blur: "none",
    },
    type: {
      display: `'JetBrains Mono', ui-monospace, monospace`,
      body: `'IBM Plex Sans', ${SANS}`,
      mono: `'JetBrains Mono', ui-monospace, monospace`,
      displayWeight: 500,
      displayTracking: "-0.02em",
      displayTransform: "uppercase",
      displayScale: 0.86,
      kicker: `'JetBrains Mono', ui-monospace, monospace`,
      kickerWeight: 400,
      kickerTracking: "0.36em",
    },
    topBar: true,
    grain: 0.08,
    ground: (seed) => [
      rules("#4DFF9E", 0.05, 4),
      brick("#4DFF9E", 0.07, 168),
      block(pick(seed, 14, ["left top", "right top"]), "44%", "8px", "#1FBFA8", 0.5),
      flat("#07120E"),
    ],
    swatch: ["#07120E", "#4DFF9E", "#1FBFA8", "#DFFFE9"],
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
    id: "quilt-folk",
    label: "Quilt Folk",
    tagline: "Patchwork blocks, stitched keylines, indigo and marigold.",
    reference: "Gee's Bend quilts · Amish barn blocks · folk-craft broadsides",
    mode: "light",
    tokens: {
      surface: "#F6F1E5",
      ink: "#1B2440",
      inkMuted: "#4A5570",
      inkFaint: "#8A8FA0",
      accent: "#2F4A9C",
      accentText: "#243C82",
      accentAlt: "#E3A11C",
      primary: "#2F4A9C",
      hairline: "rgba(27,36,64,0.18)",
    },
    card: {
      bg: "#FFFDF6",
      border: "2px dashed rgba(27,36,64,0.28)",
      radius: 2,
      shadow: "none",
      blur: "none",
    },
    type: {
      display: `'Archivo', ${SANS}`,
      body: `'Work Sans', ${SANS}`,
      mono: `'Space Mono', ui-monospace, monospace`,
      displayWeight: 700,
      displayTracking: "-0.02em",
      displayTransform: "none",
      displayScale: 0.98,
      kicker: `'Space Mono', ui-monospace, monospace`,
      kickerWeight: 700,
      kickerTracking: "0.24em",
    },
    topBar: false,
    grain: 0.05,
    ground: (seed) => [
      block(pick(seed, 21, ["left top", "right top"]), "22%", "100%", "#2F4A9C", 0.07),
      quilt("#2F4A9C", "#E3A11C", 0.16, 120),
      flat("#F6F1E5"),
    ],
    swatch: ["#F6F1E5", "#2F4A9C", "#E3A11C", "#1B2440"],
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
    id: "xerox-punk",
    label: "Xerox Punk",
    tagline: "Photocopy grey, cut-and-paste collage, tape and toner.",
    reference: "Punk zines · Xerox flyers · Jamie Reid cut-ups",
    mode: "light",
    tokens: {
      surface: "#EDEBE6",
      ink: "#121212",
      inkMuted: "#3B3A38",
      inkFaint: "#7E7C77",
      accent: "#111111",
      accentText: "#111111",
      accentAlt: "#FF2E00",
      primary: "#FF2E00",
      hairline: "rgba(18,18,18,0.4)",
    },
    card: {
      bg: "#FBFAF7",
      border: "1px solid #121212",
      radius: 0,
      shadow: "4px 4px 0 rgba(18,18,18,0.28)",
      blur: "none",
    },
    type: {
      display: `'Archivo', ${SANS}`,
      body: `'Space Mono', ui-monospace, monospace`,
      mono: `'Space Mono', ui-monospace, monospace`,
      displayWeight: 800,
      displayTracking: "-0.045em",
      displayTransform: "uppercase",
      displayScale: 0.94,
      kicker: `'Space Mono', ui-monospace, monospace`,
      kickerWeight: 700,
      kickerTracking: "0.18em",
    },
    topBar: false,
    grain: 0.14,
    ground: (seed) => [
      tornBand("#121212", 0.1, pick(seed, 24, ["top", "bottom"])),
      block(pick(seed, 24, ["right top", "left top"]), "30%", "14px", "#FF2E00", 0.9),
      halftoneTile("#121212", 0.2, 14),
      flat("#EDEBE6"),
    ],
    swatch: ["#EDEBE6", "#121212", "#FF2E00", "#7E7C77"],
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
  const bold = pack.card.radius === 0 ? 1 : 0.82; // hard-edged packs carry heavier structure
  const A = (n: number) => n * bold;

  switch (comp) {
    case "cover":
      return [
        block(pick(seed, 1, ["left bottom", "right bottom"]), "42%", "16px", t.accent, 0.95),
        block(pick(seed, 2, ["right top", "left top"]), "26%", "56%", t.accentAlt, A(0.3)),
        block("left top", "100%", "2px", t.ink, A(0.35)),
        tickRail(t.ink, A(0.4), "bottom"),
      ];

    case "statement":
      return [
        block("left top", "100%", "6px", t.accent, 0.92),
        gutters(t.ink, A(0.18), 3),
        block("left bottom", "100%", "38%", t.accentAlt, A(0.16)),
        tickRail(t.ink, A(0.28), "top"),
      ];

    case "grid":
      return [
        gutters(t.ink, A(0.2), pick(seed, 4, [4, 5, 6])),
        block("left top", "10px", "100%", t.accent, 0.9),
        block("right bottom", "100%", "8px", t.accentAlt, A(0.5)),
        crosshatch(t.ink, A(0.09), 26),
      ];

    case "editorial":
      return [
        mat(t.ink, A(0.3), 44, 1.6),
        block(pick(seed, 5, ["left top", "left bottom"]), "6px", "52%", t.accent, 0.9),
        block("right top", "30%", "3px", t.accentAlt, A(0.55)),
        tickRail(t.ink, A(0.3), "left"),
      ];

    case "media":
      return [
        block("left bottom", "100%", "30%", t.ink, A(0.22)),
        block(pick(seed, 6, ["right top", "left top"]), "38%", "8px", t.accent, 0.95),
        mat(t.ink, A(0.24), 26, 1.2),
      ];

    case "data":
      return [
        plotField(t.ink, A(0.3)),
        block("left top", "22%", "7px", t.accent, 0.95),
        dots(t.ink, A(0.12), 32, 1),
      ];

    case "quote":
      return [
        quoteMark(t.accent, A(0.34), pick(seed, 7, [86, 1090]), 96, pick(seed, 8, [2.4, 3])),
        block("left top", "12px", "100%", t.accent, 0.9),
        block("right bottom", "52%", "6px", t.accentAlt, A(0.6)),
      ];

    case "closing":
      return [
        diagonalCut(t.accent, A(0.24), pick(seed, 9, ["tl", "tr"])),
        block("left bottom", "100%", "18px", t.accent, 0.95),
        rings(t.accentAlt, A(0.14), pick(seed, 10, [1240, 200]), 700, 4),
      ];
  }
}

/** Joined `background` shorthand for a pack on a given module seed. */
export function stylePackGround(
  pack: StylePack,
  seed: string,
  comp: PackComposition = "editorial",
): string {
  return [...packLayoutLayers(pack, comp, seed), ...pack.ground(seed)].join(", ");
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
  };
}
