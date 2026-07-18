// Curated on-brand background presets for the Backgrounds & Imagery panel.
// Presets store either a CSS `backgroundImage` string (gradient / SVG pattern
// data URI) or an image URL. They apply to ANY slide, independent of variant.
//
// Rendered by SlideChrome via SlideBackdropContext. See PPTX export for the
// mapping to native PowerPoint background fills.

export type BackgroundKind = "library" | "upload" | "ai" | "color" | "gradient";
export type BackgroundScrim = "bottom" | "left" | "right" | "top" | "full" | "vignette";

export type SlideBackgroundValue = {
  kind: BackgroundKind;
  presetId?: string;
  url?: string; // for upload / ai / photo-library
  css?: string; // full CSS `background` shorthand (color + image)
  solid?: string; // hex fallback for PPTX export
  scrim?: BackgroundScrim;
  scrimStrength?: number; // 0..1
  imageDim?: number; // 0..1
  tint?: string; // hex
  darkChrome?: boolean; // hint that chrome should render on dark mode
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
    css: `${svg(
      `<circle cx='2' cy='2' r='1' fill='%23ffffff22'/>`,
    )}, ${NAVY}`,
  },
  {
    id: "bg-dot-light",
    name: "Dot Field · Light",
    category: "Pattern",
    darkChrome: false,
    solid: OFFWHITE,
    css: `${svg(
      `<circle cx='2' cy='2' r='1' fill='%2303002C22'/>`,
    )}, ${OFFWHITE}`,
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
  return BACKGROUND_PRESETS.find((p) => p.id === id) ?? null;
}

/** Resolve a persisted `content.background` into a fully hydrated value.
 *  Fills in preset CSS from the library so slide records only need to store
 *  the preset id. */
export function resolveSlideBackground(
  raw: unknown,
): SlideBackgroundValue | null {
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
    };
  }
  if (b.kind === "color" && b.solid) {
    return { kind: "color", solid: b.solid, css: b.solid, darkChrome: b.darkChrome };
  }
  if (b.kind === "gradient" && b.css) {
    return { kind: "gradient", css: b.css, solid: b.solid, darkChrome: b.darkChrome };
  }
  return null;
}
