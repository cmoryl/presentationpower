// Curated on-brand background presets for the Backgrounds & Imagery panel.
// Presets store either a CSS `backgroundImage` string (gradient / SVG pattern
// data URI) or an image URL. They apply to ANY slide, independent of variant.
//
// Rendered by SlideChrome via SlideBackdropContext. See PPTX export for the
// mapping to native PowerPoint background fills.

import { sceneBackgroundById } from "./scene-background-gallery";

export type BackgroundKind = "library" | "upload" | "ai" | "color" | "gradient" | "pattern";
export type BackgroundScrim = "bottom" | "left" | "right" | "top" | "full" | "vignette";
export type PatternId = "dots" | "grid" | "diagonal" | "waves" | "checker" | "cross" | "triangles";

export type SlideBackgroundValue = {
  kind: BackgroundKind;
  presetId?: string;
  url?: string;
  css?: string;
  solid?: string;
  scrim?: BackgroundScrim;
  scrimStrength?: number;
  imageDim?: number;
  tint?: string;
  darkChrome?: boolean;
  // Parametric — round-trip user color / intensity choices.
  color?: string;
  colorB?: string;
  angle?: number;
  intensity?: number;
  patternId?: PatternId;
  patternScale?: number;
  // Image positioning (upload / ai kinds).
  fit?: "cover" | "contain";
  zoom?: number;
  offsetX?: number;
  offsetY?: number;
};

export type BackgroundPreset = {
  id: string;
  name: string;
  category: "Gradient" | "Editorial" | "Pattern" | "Atmosphere";
  darkChrome: boolean;
  solid: string; // PPTX fallback color
  css: string; // full CSS background shorthand
};

// SVG data URI helpers — inline patterns keep the library binary-free.
const svg = (inner: string) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>${inner}</svg>`,
  )}")`;

// Brand palette anchors (mirrors mem://design/brand-palette core rules).
const NAVY = "#03002C";
const BLUE = "#003FC7";
const AQUA = "#A1FBF9";
const LAVENDER = "#C2A3FF";
const OFFWHITE = "#F2F2F2";
const BLUEWHITE = "#E0E8F5";

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  // ── Gradient — dark chrome ─────────────────────────────────────────────
  {
    id: "bg-navy-aurora",
    name: "Navy Aurora",
    category: "Gradient",
    darkChrome: true,
    solid: NAVY,
    css: `radial-gradient(130% 90% at 12% 8%, ${BLUE}55 0%, transparent 55%), radial-gradient(80% 60% at 100% 100%, ${AQUA}22 0%, transparent 60%), linear-gradient(180deg, ${NAVY} 0%, #05003C 100%)`,
  },
  {
    id: "bg-navy-spotlight",
    name: "Navy Spotlight",
    category: "Gradient",
    darkChrome: true,
    solid: NAVY,
    css: `radial-gradient(80% 55% at 50% 30%, ${BLUE}66 0%, transparent 60%), ${NAVY}`,
  },
  {
    id: "bg-cobalt-ink",
    name: "Cobalt Ink",
    category: "Gradient",
    darkChrome: true,
    solid: BLUE,
    css: `linear-gradient(135deg, ${BLUE} 0%, ${NAVY} 100%)`,
  },
  {
    id: "bg-lavender-haze",
    name: "Lavender Haze",
    category: "Gradient",
    darkChrome: true,
    solid: NAVY,
    css: `radial-gradient(100% 70% at 10% 100%, ${LAVENDER}44 0%, transparent 60%), radial-gradient(90% 60% at 90% 0%, ${BLUE}55 0%, transparent 55%), ${NAVY}`,
  },
  // ── Gradient — light chrome ────────────────────────────────────────────
  {
    id: "bg-porcelain-wash",
    name: "Porcelain Wash",
    category: "Gradient",
    darkChrome: false,
    solid: "#FFFFFF",
    css: `linear-gradient(180deg, #FFFFFF 0%, ${BLUEWHITE} 100%)`,
  },
  {
    id: "bg-editorial-cream",
    name: "Editorial Cream",
    category: "Gradient",
    darkChrome: false,
    solid: OFFWHITE,
    css: `radial-gradient(120% 80% at 100% 0%, ${AQUA}22 0%, transparent 55%), linear-gradient(180deg, #FDFDFB 0%, ${OFFWHITE} 100%)`,
  },
  {
    id: "bg-blue-mist",
    name: "Blue Mist",
    category: "Gradient",
    darkChrome: false,
    solid: BLUEWHITE,
    css: `radial-gradient(100% 60% at 0% 100%, ${BLUE}22 0%, transparent 55%), ${BLUEWHITE}`,
  },
  // ── Pattern ────────────────────────────────────────────────────────────
  {
    id: "bg-grid-navy",
    name: "Editorial Grid · Navy",
    category: "Pattern",
    darkChrome: true,
    solid: NAVY,
    css: `${svg(
      `<defs><pattern id='g' width='24' height='24' patternUnits='userSpaceOnUse'><path d='M24 0H0V24' fill='none' stroke='%23ffffff14' stroke-width='0.5'/></pattern></defs><rect width='120' height='120' fill='url(%23g)'/>`,
    )}, ${NAVY}`,
  },
  {
    id: "bg-grid-light",
    name: "Editorial Grid · Light",
    category: "Pattern",
    darkChrome: false,
    solid: "#FFFFFF",
    css: `${svg(
      `<defs><pattern id='g' width='24' height='24' patternUnits='userSpaceOnUse'><path d='M24 0H0V24' fill='none' stroke='%2303002C14' stroke-width='0.5'/></pattern></defs><rect width='120' height='120' fill='url(%23g)'/>`,
    )}, #FFFFFF`,
  },
  {
    id: "bg-dot-navy",
    name: "Dot Field · Navy",
    category: "Pattern",
    darkChrome: true,
    solid: NAVY,
    css: `${svg(`<circle cx='2' cy='2' r='1' fill='%23ffffff22'/>`)}, ${NAVY}`,
  },
  {
    id: "bg-dot-light",
    name: "Dot Field · Light",
    category: "Pattern",
    darkChrome: false,
    solid: OFFWHITE,
    css: `${svg(`<circle cx='2' cy='2' r='1' fill='%2303002C22'/>`)}, ${OFFWHITE}`,
  },
  {
    id: "bg-diagonal-rule",
    name: "Diagonal Rule",
    category: "Pattern",
    darkChrome: true,
    solid: NAVY,
    css: `${svg(
      `<path d='M-4 30 L30 -4 M-4 60 L60 -4 M-4 90 L90 -4 M-4 120 L120 -4' stroke='%23ffffff12' stroke-width='1'/>`,
    )}, ${NAVY}`,
  },
  {
    id: "bg-concentric",
    name: "Concentric Rings",
    category: "Pattern",
    darkChrome: true,
    solid: NAVY,
    css: `radial-gradient(circle at 50% 50%, transparent 0, transparent 22%, ${BLUE}22 22%, ${BLUE}22 22.6%, transparent 22.6%, transparent 40%, ${BLUE}22 40%, ${BLUE}22 40.6%, transparent 40.6%, transparent 60%, ${BLUE}22 60%, ${BLUE}22 60.6%, transparent 60.6%), ${NAVY}`,
  },
  // ── Atmosphere ─────────────────────────────────────────────────────────
  {
    id: "bg-aqua-glow",
    name: "Aqua Glow",
    category: "Atmosphere",
    darkChrome: true,
    solid: NAVY,
    css: `radial-gradient(70% 50% at 50% 100%, ${AQUA}44 0%, transparent 65%), ${NAVY}`,
  },
  {
    id: "bg-noir-vignette",
    name: "Noir Vignette",
    category: "Atmosphere",
    darkChrome: true,
    solid: NAVY,
    css: `radial-gradient(120% 80% at 50% 50%, ${BLUE}33 0%, ${NAVY} 60%, #000000 100%)`,
  },
  {
    id: "bg-paper-grain",
    name: "Paper Grain",
    category: "Atmosphere",
    darkChrome: false,
    solid: OFFWHITE,
    css: `${svg(
      `<filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' seed='4'/><feColorMatrix values='0 0 0 0 0.02  0 0 0 0 0.02  0 0 0 0 0.15  0 0 0 0.05 0'/></filter><rect width='120' height='120' filter='url(%23n)'/>`,
    )}, ${OFFWHITE}`,
  },
];

export function getBackgroundPreset(id: string | undefined): BackgroundPreset | null {
  if (!id) return null;
  const core = BACKGROUND_PRESETS.find((p) => p.id === id);
  if (core) return core;
  // Curated scene gallery (skin × deck section) presets share the same shape,
  // so they resolve through the identical "library" path on screen and in PPTX.
  return sceneBackgroundById(id);
}

// ── Parametric helpers ────────────────────────────────────────────────
function clamp01(n: number | undefined, d = 1): number {
  if (typeof n !== "number" || Number.isNaN(n)) return d;
  return Math.max(0, Math.min(1, n));
}

export function hexToRgba(hex: string, alpha = 1): string {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
}

export function isDarkHex(hex: string): boolean {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  // relative luminance
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.55;
}

export function buildSolidCss(color: string, intensity = 1): string {
  return hexToRgba(color, intensity);
}

export function buildGradientCss(
  colorA: string,
  colorB: string,
  angle = 135,
  intensity = 1,
): string {
  return `linear-gradient(${angle}deg, ${hexToRgba(colorA, intensity)} 0%, ${hexToRgba(
    colorB,
    intensity,
  )} 100%)`;
}

export const PATTERN_LIBRARY: { id: PatternId; name: string }[] = [
  { id: "dots", name: "Dots" },
  { id: "grid", name: "Grid" },
  { id: "diagonal", name: "Diagonal" },
  { id: "waves", name: "Waves" },
  { id: "checker", name: "Checker" },
  { id: "cross", name: "Cross" },
  { id: "triangles", name: "Triangles" },
];

function patternSvg(id: PatternId, fg: string, scale: number): string {
  const s = Math.max(8, Math.min(80, Math.round(scale)));
  const stroke = encodeURIComponent(fg);
  switch (id) {
    case "dots":
      return `<circle cx='${s / 2}' cy='${s / 2}' r='${Math.max(1, s / 16)}' fill='${stroke}'/>`;
    case "grid":
      return `<path d='M${s} 0H0V${s}' fill='none' stroke='${stroke}' stroke-width='1'/>`;
    case "diagonal":
      return `<path d='M-1 ${s / 2} L${s / 2} -1 M${s / 2} ${s + 1} L${s + 1} ${s / 2}' stroke='${stroke}' stroke-width='1'/>`;
    case "waves":
      return `<path d='M0 ${s / 2} Q ${s / 4} 0, ${s / 2} ${s / 2} T ${s} ${s / 2}' fill='none' stroke='${stroke}' stroke-width='1'/>`;
    case "checker":
      return `<rect width='${s / 2}' height='${s / 2}' fill='${stroke}'/><rect x='${s / 2}' y='${s / 2}' width='${s / 2}' height='${s / 2}' fill='${stroke}'/>`;
    case "cross":
      return `<path d='M${s / 2} ${s / 4} V${(3 * s) / 4} M${s / 4} ${s / 2} H${(3 * s) / 4}' stroke='${stroke}' stroke-width='1'/>`;
    case "triangles":
      return `<path d='M0 ${s} L${s / 2} 0 L${s} ${s} Z' fill='none' stroke='${stroke}' stroke-width='1'/>`;
  }
}

export function buildPatternCss(
  patternId: PatternId,
  fg: string,
  bg: string,
  intensity = 0.35,
  scale = 24,
): string {
  const alpha = clamp01(intensity);
  const inner = patternSvg(patternId, hexToRgba(fg, alpha), scale);
  const uri = `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${scale}' height='${scale}'>${inner}</svg>`,
  )}")`;
  return `${uri}, ${bg}`;
}

/** Resolve a persisted `content.background` into a fully hydrated value. */
export function resolveSlideBackground(raw: unknown): SlideBackgroundValue | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Partial<SlideBackgroundValue>;
  if (!b.kind) return null;
  if (b.kind === "library") {
    const preset = getBackgroundPreset(b.presetId);
    if (!preset) return null;
    return {
      kind: "library",
      presetId: preset.id,
      css: preset.css,
      solid: preset.solid,
      darkChrome: preset.darkChrome,
      scrim: b.scrim,
      scrimStrength: b.scrimStrength,
      imageDim: b.imageDim,
      tint: b.tint,
    };
  }
  if ((b.kind === "upload" || b.kind === "ai") && b.url) {
    return {
      kind: b.kind,
      url: b.url,
      scrim: b.scrim ?? "bottom",
      scrimStrength: b.scrimStrength ?? 0.55,
      imageDim: b.imageDim ?? 0.1,
      tint: b.tint ?? NAVY,
      darkChrome: b.darkChrome ?? true,
      fit: b.fit ?? "cover",
      zoom: typeof b.zoom === "number" ? b.zoom : 1,
      offsetX: typeof b.offsetX === "number" ? b.offsetX : 0,
      offsetY: typeof b.offsetY === "number" ? b.offsetY : 0,
    };
  }
  if (b.kind === "color" && (b.color || b.solid)) {
    const color = b.color ?? b.solid ?? NAVY;
    const intensity = clamp01(b.intensity, 1);
    return {
      kind: "color",
      color,
      intensity,
      solid: color,
      css: buildSolidCss(color, intensity),
      darkChrome: isDarkHex(color),
    };
  }
  if (b.kind === "gradient") {
    const colorA = b.color ?? BLUE;
    const colorB = b.colorB ?? NAVY;
    const angle = typeof b.angle === "number" ? b.angle : 135;
    const intensity = clamp01(b.intensity, 1);
    return {
      kind: "gradient",
      color: colorA,
      colorB,
      angle,
      intensity,
      css: buildGradientCss(colorA, colorB, angle, intensity),
      solid: colorA,
      darkChrome: isDarkHex(colorA) && isDarkHex(colorB),
    };
  }
  if (b.kind === "pattern" && b.patternId) {
    const fg = b.color ?? "#03002C";
    const bg = b.colorB ?? "#F2F2F2";
    const intensity = clamp01(b.intensity, 0.35);
    const scale = b.patternScale ?? 24;
    return {
      kind: "pattern",
      patternId: b.patternId,
      color: fg,
      colorB: bg,
      intensity,
      patternScale: scale,
      css: buildPatternCss(b.patternId, fg, bg, intensity, scale),
      solid: bg,
      darkChrome: isDarkHex(bg),
    };
  }
  return null;
}
