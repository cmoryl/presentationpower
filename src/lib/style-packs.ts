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
  | "retro-arcade";


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
    label: "Ink Sumi",
    tagline: "Rice paper, one brush gesture, vermilion seal.",
    reference: "Sumi-e scrolls · Japanese photobooks · Ryuichi Kawamura layouts",
    mode: "light",
    tokens: {
      surface: "#F7F5F0",
      ink: "#141414",
      inkMuted: "#4C4A46",
      inkFaint: "#8E8B84",
      accent: "#B02A1F",
      accentText: "#96231A",
      accentAlt: "#2F2C28",
      primary: "#141414",
      hairline: "rgba(20,20,20,0.12)",
    },
    card: {
      bg: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(247,245,240,0.92) 100%)",
      border: "1px solid rgba(20,20,20,0.08)",
      radius: 1,
      shadow: "none",
      blur: "none",
    },
    type: {
      display: `'Cormorant Garamond', Georgia, serif`,
      body: `'Karla', ${SANS}`,
      mono: `'Space Mono', ui-monospace, monospace`,
      displayWeight: 300,
      displayTracking: "-0.005em",
      displayTransform: "none",
      displayScale: 1.16,
      kicker: `'Karla', ${SANS}`,
      kickerWeight: 500,
      kickerTracking: "0.34em",
    },
    topBar: false,
    grain: 0.1,
    ground: (seed) => [
      block(pick(seed, 11, ["right top", "right bottom"]), "56px", "56px", "#B02A1F", 0.9),
      bloom("22% 78%", 62, 58, "#2F2C28", 0.05),
      `linear-gradient(180deg, #FAF8F4 0%, #F2EFE8 100%)`,
    ],
    swatch: ["#F7F5F0", "#141414", "#B02A1F", "#8E8B84"],
  },

  {
    id: "terrazzo-studio",
    label: "Terrazzo Studio",
    tagline: "Poured stone chips, soft plaster, mint and coral flecks.",
    reference: "Milanese terrazzo floors · Memphis studio interiors · Bloc paper",
    mode: "light",
    tokens: {
      surface: "#F6F2EC",
      ink: "#221F1C",
      inkMuted: "#57514A",
      inkFaint: "#8F887F",
      accent: "#E1653C",
      accentText: "#BF4A25",
      accentAlt: "#3FA98B",
      primary: "#221F1C",
      hairline: "rgba(34,31,28,0.12)",
    },
    card: {
      bg: "linear-gradient(180deg, #FFFFFF 0%, #F7F2EA 100%)",
      border: "1px solid rgba(34,31,28,0.08)",
      radius: 20,
      shadow: "0 22px 44px -34px rgba(34,31,28,0.28)",
      blur: "none",
    },
    type: {
      display: `'Syne', ${SANS}`,
      body: `'Plus Jakarta Sans', ${SANS}`,
      mono: `'JetBrains Mono', ui-monospace, monospace`,
      displayWeight: 700,
      displayTracking: "-0.03em",
      displayTransform: "none",
      displayScale: 0.98,
      kicker: `'Plus Jakarta Sans', ${SANS}`,
      kickerWeight: 700,
      kickerTracking: "0.18em",
    },
    topBar: false,
    grain: 0.07,
    ground: (seed) => [
      bloom(pick(seed, 12, ["8% 10%", "92% 12%"]), 46, 42, "#3FA98B", 0.14),
      bloom("88% 88%", 52, 48, "#E1653C", 0.12),
      `linear-gradient(160deg, #FBF7F1 0%, #F2ECE3 100%)`,
    ],
    swatch: ["#F6F2EC", "#E1653C", "#3FA98B", "#221F1C"],
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
      `linear-gradient(#FFFFFF, #FFFFFF)`,
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
      bloom(pick(seed, 14, ["16% 16%", "84% 22%"]), 54, 48, "#1FBFA8", 0.16),
      bloom("70% 96%", 60, 46, "#4DFF9E", 0.1),
      `linear-gradient(165deg, #0B2018 0%, #07120E 62%, #040B08 100%)`,
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
      accentText: "#E7BE६9".replace("६", "6"),
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
      bloom("84% 14%", 62, 54, "#5FA8A0", 0.14),
      bloom("10% 92%", 56, 48, "#D8A94B", 0.08),
      `linear-gradient(155deg, #102A38 0%, #0A1A24 60%, #061219 100%)`,
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
      stripes(90, "#1F1A14", 0.03, 6),
      `linear-gradient(180deg, #F5EEDF 0%, #EBE1CC 100%)`,
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
      bloom(pick(seed, 17, ["6% 96%", "94% 96%"]), 58, 44, "#FF2D8A", 0.12),
      bloom("50% 0%", 70, 34, "#33D6FF", 0.08),
      `linear-gradient(180deg, #141922 0%, #0E1116 100%)`,
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
      bloom("50% 100%", 84, 52, "#FF4D9D", 0.2),
      bloom(pick(seed, 18, ["12% 8%", "88% 8%"]), 52, 44, "#41E8FF", 0.14),
      `linear-gradient(180deg, #2A1150 0%, #180B2E 58%, #0D0619 100%)`,
    ],
    swatch: ["#180B2E", "#FF4D9D", "#41E8FF", "#FFF3FB"],
  },
];


export const STYLE_PACK_IDS = STYLE_PACKS.map((p) => p.id);

export function stylePackById(id: string | null | undefined): StylePack | null {
  if (!id) return null;
  return STYLE_PACKS.find((p) => p.id === id) ?? null;
}

/** Joined `background` shorthand for a pack on a given module seed. */
export function stylePackGround(pack: StylePack, seed: string): string {
  return pack.ground(seed).join(", ");
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
