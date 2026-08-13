// -----------------------------------------------------------------------------
// Card / tile SURFACE treatment for PPTX exports
// -----------------------------------------------------------------------------
// `export-radius.ts` is the single source of truth for the corner of an
// exported box. This module is the same thing for everything *inside* that
// corner: the vertical gradient, the hairline inset stroke, the drop shadow and
// the soft ambient wash that stands in for `backdrop-filter`.
//
// Why it exists: before this, every glass surface exported as a FLAT solid
// painted from the gradient's top stop only (`141435`), with
// `line: { type: "none" }` and no elevation anywhere in the exporter. Next to
// the build, an exported card read as a plain navy box.
//
// The numbers below are byte-locked mirrors of the `.glass` / `.glass-dark`
// utilities in `src/styles.css` — the same relationship `EXPORT_RADIUS_IN` has
// to the `surface-tokens.ts` radius ladder. `export-surface-parity.test.ts`
// parses the CSS and fails if either side drifts.
//
// Layered mode rule: nothing here may be baked into a raster plate. Every value
// is emitted as a native, editable PowerPoint property (gradient stops, line
// colour/width, blur/distance/angle in Format Shape) so a user who nudges a
// card takes its surface with it.
// -----------------------------------------------------------------------------

import { PX_PER_IN } from "@/lib/export-radius";

/** PPTX widescreen stage, inches (mirrors export-radius). */
export const SLIDE_W_IN = 13.333;
export const SLIDE_H_IN = 7.5;

/**
 * Boxes thinner than this in either axis are rules, ticks, underlines and
 * progress tracks. They get no radius (see `designRadiusIn`) and no surface
 * treatment either — a gradient + shadow on a 2px hairline reads as a smudge.
 */
export const SURFACE_HAIRLINE_IN = 0.14;

/**
 * Card-class threshold (minimum side, inches). At or above it a box is a card /
 * tile / band and earns the full treatment: gradient, hairline, drop shadow and
 * the ambient backdrop wash.
 *
 * BELOW it — chips, pills, stat tiles, accent badges, icon wells — the on-screen
 * renderer paints FLAT: `IconWell` and the chip/badge helpers in
 * `flagship.tsx` use a single solid tint plus a 1px ring, with no gradient and
 * no `boxShadow`. Elevating those in the export would read as "everything is
 * floating", so the chip tier exports flat + hairline only. Matches the 0.55in
 * step in the radius ladder (`designRadiusIn`) so both tiers cut at one place.
 */
export const SURFACE_CARD_MIN_IN = 0.55;

export type SurfaceTier = "none" | "chip" | "card";

/** Which surface tier a box of this size belongs to. */
export function surfaceTier(w: number, h: number): SurfaceTier {
  if (!surfaceEligible(w, h)) return "none";
  return Math.min(w, h) >= SURFACE_CARD_MIN_IN ? "card" : "chip";
}

/** Stage px → points (PowerPoint shadow blur/offset unit). */
export function pxToPt(px: number): number {
  return (px / PX_PER_IN) * 72;
}

/**
 * Byte-locked mirror of the glass utilities in `src/styles.css`.
 *
 *   `.glass-dark`            background: linear-gradient(180deg, #141435, #03002c)
 *                            border: 1px solid white 22%
 *                            backdrop-filter: blur(28px)
 *                            box-shadow: 0 30px 60px -25px rgba(0,0,0,.6)
 *   `.glass` (opaque form,   background: linear-gradient(white 98% → white 92%)
 *    `.contrast-boost .glass`) border-color: #03002c 22%
 *                            backdrop-filter: blur(22px)  [base .glass]
 *                            box-shadow: 0 20px 40px -20px #03002c 35%
 */
export const SURFACE_CSS_TOKENS = {
  dark: {
    /** `.glass-dark` gradient stops. */
    gradientTop: "141435",
    gradientBottom: "03002C",
    /** `border: 1px solid color-mix(white 22%)`. */
    strokeColor: "FFFFFF",
    strokeAlpha: 0.22,
    strokeWidthPx: 1,
    /** `0 30px 60px -25px rgba(0,0,0,0.6)`. */
    shadowColor: "000000",
    shadowAlpha: 0.6,
    shadowOffsetPx: 30,
    shadowBlurPx: 60,
    /** `backdrop-filter: blur(28px)`. */
    backdropBlurPx: 28,
  },
  light: {
    /**
     * `.contrast-boost .glass` fades white 98% → 92%: a 6-point drop in
     * whiteness, i.e. the bottom of a light card sits 6% deeper in ink.
     */
    inkMixBottom: 0.06,
    ink: "03002C",
    /** `border-color: color-mix(#03002c 22%)`. */
    strokeColor: "03002C",
    strokeAlpha: 0.22,
    strokeWidthPx: 1,
    /** `0 20px 40px -20px color-mix(#03002c 35%)`. */
    shadowColor: "03002C",
    shadowAlpha: 0.35,
    shadowOffsetPx: 20,
    shadowBlurPx: 40,
    /** `.glass` `backdrop-filter: blur(22px)`. */
    backdropBlurPx: 22,
  },
} as const;

/**
 * How far a NON-glass fill (an accent-tinted tile, a brand chip) is pulled
 * toward the mode ground at the bottom stop. The canonical glass pair travels
 * the full distance (141435 → 03002C is 100% of the way to the ground), but a
 * coloured tile has to keep its identity, so it only travels part way.
 */
export const NON_TOKEN_GROUND_BLEND = 0.35;

/** The ambient wash approximating `backdrop-filter`: high blur, low alpha. */
export const AMBIENT_ALPHA = 0.18;

// -----------------------------------------------------------------------------
// The CANONICAL module-card glass — byte-locked mirror of `moduleCardSurface`
// in `flagship.tsx` (which is itself built from `accent-tokens.ts`).
// -----------------------------------------------------------------------------
// `getSurfaceTreatment` above approximates a card by darkening whatever flat
// fill a module renderer happened to pick. That is a guess, and it is why the
// exported pyramid bars / stat tiles / graph frames read as plain boxes next to
// the build: on screen every one of those is the SAME accent glass panel.
//
// The stops below are the same numbers the renderer paints:
//
//   light  `accentTokens().panelGradient`
//          linear-gradient(180deg, accent@26% 0%, accent@12% 34%,
//                          white@60% 74%, white@0% 100%)
//   dark   background      rgba(10, 8, 48, 0.22)
//          backgroundImage `accentTokens().wash` (accent@14% top-left → clear)
//          border          1px solid accent@30%
//
// Emitted as native gradient stops with per-stop alpha, a native hairline and a
// native ambient shadow, so the card stays fully editable in PowerPoint.
export const GLASS_CARD_TOKENS = {
  light: {
    /** `panelGradient` stops: [alpha, position, colour]. */
    stops: [
      { at: 0, alpha: 0.26, white: false },
      { at: 34, alpha: 0.12, white: false },
      { at: 74, alpha: 0.6, white: true },
      { at: 100, alpha: 0, white: true },
    ],
    /** `ACCENT_ALPHA.light.ring`. */
    ringAlpha: 0.32,
    /** `backdrop-filter: blur(6px)`. */
    backdropBlurPx: 6,
  },
  dark: {
    /** `rgba(10, 8, 48, 0.22)` base fill. */
    base: "0A0830",
    baseAlpha: 0.22,
    /** `ACCENT_ALPHA.dark.wash` — the accent bloom at the top of the tile. */
    washAlpha: 0.14,
    /** `ACCENT_ALPHA.dark.ring`. */
    ringAlpha: 0.3,
    /** `backdrop-filter: blur(20px) saturate(150%)`. */
    backdropBlurPx: 20,
  },
} as const;

/** White, for the light panel's lower stops. */
const GLASS_LIGHT_STOP = "FFFFFF";

/**
 * The exact on-screen module-card glass for a box of this size, as native PPTX
 * properties. `emphasis` mirrors the renderer's own `emphasis` knob (used by
 * stacked strata such as the value pyramid) and scales the tint alphas.
 *
 * Returns null for hairlines / full-slide scrims, exactly like
 * {@link getSurfaceTreatment}.
 */
export function getGlassTreatment(opts: {
  w: number;
  h: number;
  accent?: string;
  dark: boolean;
  emphasis?: number;
}): SurfaceTreatment | null {
  const tier = surfaceTier(opts.w, opts.h);
  if (tier === "none") return null;
  const accent = clampHex(opts.accent ?? "") || "003FC7";
  const e = Math.max(0.4, Math.min(2, opts.emphasis ?? 1));
  const dark = !!opts.dark;
  const T = dark ? GLASS_CARD_TOKENS.dark : GLASS_CARD_TOKENS.light;

  const gradient: SurfaceGradient = dark
    ? {
        angleDeg: 180,
        stops: [
          // The accent bloom sits at the top of the tile and clears by ~64%,
          // matching the renderer's radial wash over the navy base.
          {
            color: mixHex(GLASS_CARD_TOKENS.dark.base, accent, 0.75),
            pos: 0,
            alpha: Math.min(0.85, (GLASS_CARD_TOKENS.dark.baseAlpha + GLASS_CARD_TOKENS.dark.washAlpha) * e),
          },
          {
            color: GLASS_CARD_TOKENS.dark.base,
            pos: 64,
            alpha: Math.min(0.85, GLASS_CARD_TOKENS.dark.baseAlpha * e),
          },
          {
            color: GLASS_CARD_TOKENS.dark.base,
            pos: 100,
            alpha: Math.min(0.85, GLASS_CARD_TOKENS.dark.baseAlpha * e * 0.85),
          },
        ],
      }
    : {
        angleDeg: 180,
        stops: GLASS_CARD_TOKENS.light.stops.map((s) => ({
          color: s.white ? GLASS_LIGHT_STOP : accent,
          pos: s.at,
          alpha: Math.min(1, s.alpha * (s.white ? 1 : e)),
        })),
      };

  const ringAlpha = Math.min(0.85, (dark ? T.ringAlpha : GLASS_CARD_TOKENS.light.ringAlpha) * e);
  const dropTokens = dark ? SURFACE_CSS_TOKENS.dark : SURFACE_CSS_TOKENS.light;

  return {
    tier,
    // Flat fallback for readers that ignore the gradient patch: the tile's own
    // mid-tone, not the raw accent, so nothing turns into a solid blue slab.
    fill: dark
      ? mixHex(SURFACE_CSS_TOKENS.dark.gradientBottom, accent, 0.16)
      : mixHex(GLASS_LIGHT_STOP, accent, 0.12 * e),
    gradient,
    line: {
      color: accent,
      width: Math.round(pxToPt(1) * 1000) / 1000,
      transparency: Math.round((1 - ringAlpha) * 100),
    },
    shadow: {
      type: "outer",
      color: dropTokens.shadowColor,
      opacity: dark ? 0.35 : 0.14,
      blur: Math.round(pxToPt(dark ? 40 : 24) * 100) / 100,
      offset: Math.round(pxToPt(dark ? 12 : 8) * 100) / 100,
      angle: 90,
    },
    ambient: {
      type: "outer",
      color: dropTokens.shadowColor,
      opacity: AMBIENT_ALPHA,
      blur: Math.round(pxToPt(T.backdropBlurPx * 2) * 100) / 100,
      offset: 0,
      angle: 90,
    },
  };
}

/**
 * Neutral card fills the renderer paints as GLASS on screen. When a module
 * renderer picks one of these as a flat fill it is asking for the module-card
 * surface, so the export upgrades it to {@link getGlassTreatment} instead of
 * the generic darkening pass. Coloured tiles (accent KPI blocks, category
 * swatches) are untouched and keep their identity.
 */
export const GLASS_FILL_HEXES = new Set([
  "FFFFFF",
  "F2F2F2",
  "E0E8F5",
  "FAFBFF",
  "141435",
  "0A0830",
  "03002C",
]);

/** True when a flat fill is the renderer's stand-in for the glass card. */
export function isGlassFill(hex: string | undefined | null): boolean {
  const h = clampHex(hex ?? "");
  return !!h && GLASS_FILL_HEXES.has(h);
}



export interface GradientStop {
  /** 6-digit hex, uppercase, no `#`. */
  color: string;
  /** 0-100. */
  pos: number;
  /** 0-1; 1 = opaque. */
  alpha?: number;
}

export interface SurfaceGradient {
  /** CSS-style degrees; 180 = top-to-bottom (matches the glass utilities). */
  angleDeg: number;
  stops: GradientStop[];
}

export interface SurfaceShadow {
  /** pptxgenjs ShadowProps-compatible. */
  type: "outer";
  color: string;
  /** 0-1. */
  opacity: number;
  /** points. */
  blur: number;
  /** points. */
  offset: number;
  /** degrees; 90 = straight down. */
  angle: number;
}

export interface SurfaceLine {
  color: string;
  /** points. */
  width: number;
  /** pptxgenjs line transparency, 0-100 (0 = opaque). */
  transparency: number;
}

export interface SurfaceTreatment {
  /**
   * `card` = gradient + hairline + drop shadow + ambient wash.
   * `chip` = hairline only; the flat fill and the elevation-free look the
   * on-screen chip/pill/icon-well primitives paint.
   */
  tier: Exclude<SurfaceTier, "none">;
  /** Solid fallback for readers that ignore our gradient patch. */
  fill: string;
  gradient: SurfaceGradient;
  line: SurfaceLine;
  /** Drop shadow — emitted through the native pptxgenjs `shadow` prop. */
  shadow: SurfaceShadow;
  /** Ambient backdrop-blur stand-in — emitted by `withShapeShadows`. */
  ambient: SurfaceShadow;
}

function clampHex(hex: string): string {
  const h = String(hex ?? "").replace(/^#/, "").trim().toUpperCase();
  if (/^[0-9A-F]{6}$/.test(h)) return h;
  if (/^[0-9A-F]{3}$/.test(h)) return h.replace(/(.)/g, "$1$1");
  return "";
}

/** Linear channel mix, `t` = 0 keeps `a`, 1 returns `b`. */
export function mixHex(a: string, b: string, t: number): string {
  const A = clampHex(a) || "000000";
  const B = clampHex(b) || "000000";
  const k = Math.min(1, Math.max(0, t));
  let out = "";
  for (let i = 0; i < 3; i++) {
    const ca = Number.parseInt(A.slice(i * 2, i * 2 + 2), 16);
    const cb = Number.parseInt(B.slice(i * 2, i * 2 + 2), 16);
    out += Math.round(ca + (cb - ca) * k)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  }
  return out;
}

/**
 * True when a box is a card/tile/band — i.e. big enough to carry a surface.
 * Same exclusions as the radius ladder: full-slide scrims (a gradient + shadow
 * on the wash would frame the whole slide) and sub-hairline rules.
 */
export function surfaceEligible(w: number, h: number): boolean {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return false;
  if (w >= SLIDE_W_IN - 0.02 && h >= SLIDE_H_IN - 0.02) return false;
  return Math.min(w, h) >= SURFACE_HAIRLINE_IN;
}

/**
 * The full surface treatment for a card of this size and base fill.
 *
 * `dark` selects the `.glass-dark` vs `.glass` token family. `fill` is the flat
 * colour the exporter had chosen; it becomes the gradient's TOP stop so nothing
 * shifts hue — the gradient only adds the vertical fall-off the renderer paints.
 */
export function getSurfaceTreatment(opts: {
  w: number;
  h: number;
  fill?: string;
  dark: boolean;
}): SurfaceTreatment | null {
  const tier = surfaceTier(opts.w, opts.h);
  if (tier === "none") return null;
  const dark = !!opts.dark;
  const T = dark ? SURFACE_CSS_TOKENS.dark : SURFACE_CSS_TOKENS.light;
  const top = clampHex(opts.fill ?? "") || (dark ? SURFACE_CSS_TOKENS.dark.gradientTop : "FFFFFF");

  let bottom: string;
  if (dark) {
    const ground = SURFACE_CSS_TOKENS.dark.gradientBottom;
    bottom =
      top === SURFACE_CSS_TOKENS.dark.gradientTop
        ? ground // the canonical glass pair, byte-for-byte
        : mixHex(top, ground, NON_TOKEN_GROUND_BLEND);
  } else {
    bottom = mixHex(top, SURFACE_CSS_TOKENS.light.ink, SURFACE_CSS_TOKENS.light.inkMixBottom);
  }

  const dropBlurPx = dark
    ? SURFACE_CSS_TOKENS.dark.shadowBlurPx
    : SURFACE_CSS_TOKENS.light.shadowBlurPx;
  const dropOffsetPx = dark
    ? SURFACE_CSS_TOKENS.dark.shadowOffsetPx
    : SURFACE_CSS_TOKENS.light.shadowOffsetPx;

  return {
    tier,
    fill: top,
    gradient: {
      angleDeg: 180,
      stops: [
        { color: top, pos: 0 },
        { color: bottom, pos: 100 },
      ],
    },
    line: {
      color: T.strokeColor,
      width: Math.round(pxToPt(T.strokeWidthPx) * 1000) / 1000,
      transparency: Math.round((1 - T.strokeAlpha) * 100),
    },
    shadow: {
      type: "outer",
      color: dark ? SURFACE_CSS_TOKENS.dark.shadowColor : SURFACE_CSS_TOKENS.light.shadowColor,
      opacity: dark ? SURFACE_CSS_TOKENS.dark.shadowAlpha : SURFACE_CSS_TOKENS.light.shadowAlpha,
      blur: Math.round(pxToPt(dropBlurPx) * 100) / 100,
      offset: Math.round(pxToPt(dropOffsetPx) * 100) / 100,
      angle: 90,
    },
    // `backdrop-filter: blur(Npx)` has no PowerPoint equivalent. Approximated
    // as a wide, near-transparent outer shadow with no offset: a halo that
    // lifts the card off the ground and, crucially, TRAVELS WITH THE SHAPE.
    // Baking the wash into the decor plate would strand it the moment a user
    // moves the box, which is a worse failure than a soft approximation.
    ambient: {
      type: "outer",
      color: dark ? SURFACE_CSS_TOKENS.dark.shadowColor : SURFACE_CSS_TOKENS.light.shadowColor,
      opacity: AMBIENT_ALPHA,
      blur: Math.round(pxToPt(T.backdropBlurPx * 2) * 100) / 100,
      offset: 0,
      angle: 90,
    },
  };
}

// -----------------------------------------------------------------------------
// Object-name tags (the `withRoundedPictures` pattern)
//
// pptxgenjs can emit `shadow` natively but has no gradient-fill API and only
// one shadow slot per shape, so the gradient and the ambient wash ride along in
// the object name and are consumed by the zip pass in pptx-native-xml.ts.
// -----------------------------------------------------------------------------

/** `[gf:<angleDeg>:<hex>@<pos>[:<alpha%>],…]` */
export const GRADIENT_TAG_RE = /\[gf:(\d+):([^\]]+)\]\s*/;
/** `[sh:<blurPt>:<offsetPt>:<angleDeg>:<hex>:<alpha%>]` */
export const AMBIENT_TAG_RE = /\[sh:([\d.]+):([\d.]+):(\d+):([0-9A-Fa-f]{6}):(\d+)\]\s*/;

export function gradientTag(g: SurfaceGradient): string {
  const stops = g.stops
    .map((s) => {
      const a = s.alpha == null || s.alpha >= 1 ? "" : `:${Math.round(s.alpha * 100)}`;
      return `${clampHex(s.color) || "000000"}@${Math.round(s.pos)}${a}`;
    })
    .join(",");
  return `[gf:${Math.round(g.angleDeg)}:${stops}]`;
}

export function ambientTag(s: SurfaceShadow): string {
  return `[sh:${s.blur}:${s.offset}:${Math.round(s.angle)}:${clampHex(s.color) || "000000"}:${Math.round(
    s.opacity * 100,
  )}]`;
}

export function parseGradientTag(name: string): SurfaceGradient | null {
  const m = GRADIENT_TAG_RE.exec(name);
  if (!m) return null;
  const stops: GradientStop[] = [];
  for (const raw of m[2].split(",")) {
    const sm = /^([0-9A-Fa-f]{6})@(\d+)(?::(\d+))?$/.exec(raw.trim());
    if (!sm) continue;
    stops.push({
      color: sm[1].toUpperCase(),
      pos: Number(sm[2]),
      alpha: sm[3] == null ? 1 : Number(sm[3]) / 100,
    });
  }
  if (stops.length < 2) return null;
  return { angleDeg: Number(m[1]), stops };
}

export function parseAmbientTag(name: string): SurfaceShadow | null {
  const m = AMBIENT_TAG_RE.exec(name);
  if (!m) return null;
  return {
    type: "outer",
    blur: Number(m[1]),
    offset: Number(m[2]),
    angle: Number(m[3]),
    color: m[4].toUpperCase(),
    opacity: Number(m[5]) / 100,
  };
}

export function stripSurfaceTags(name: string): string {
  return name.replace(GRADIENT_TAG_RE, "").replace(AMBIENT_TAG_RE, "").trim();
}

// -----------------------------------------------------------------------------
// OOXML fragments
// -----------------------------------------------------------------------------

/** CSS degrees → OOXML `a:lin@ang` (60000ths of a degree, 0 = left→right). */
export function cssAngleToOoxml(angleDeg: number): number {
  // CSS 180deg = top→bottom; OOXML 5400000 (90deg) = top→bottom.
  const ooxml = ((angleDeg - 90) % 360 + 360) % 360;
  return Math.round(ooxml * 60000);
}

export function gradFillXml(g: SurfaceGradient): string {
  const stops = g.stops
    .slice()
    .sort((a, b) => a.pos - b.pos)
    .map((s) => {
      const alpha =
        s.alpha == null || s.alpha >= 1
          ? ""
          : `<a:alpha val="${Math.round(Math.max(0, Math.min(1, s.alpha)) * 100000)}"/>`;
      return `<a:gs pos="${Math.round(Math.max(0, Math.min(100, s.pos)) * 1000)}"><a:srgbClr val="${
        clampHex(s.color) || "000000"
      }">${alpha}</a:srgbClr></a:gs>`;
    })
    .join("");
  return `<a:gradFill rotWithShape="1"><a:gsLst>${stops}</a:gsLst><a:lin ang="${cssAngleToOoxml(
    g.angleDeg,
  )}" scaled="0"/></a:gradFill>`;
}

export function outerShdwXml(s: SurfaceShadow): string {
  const blurEmu = Math.round(((s.blur / 72) * 914400));
  const distEmu = Math.round(((s.offset / 72) * 914400));
  const dir = Math.round((((s.angle % 360) + 360) % 360) * 60000);
  return (
    `<a:outerShdw blurRad="${blurEmu}" dist="${distEmu}" dir="${dir}" rotWithShape="0">` +
    `<a:srgbClr val="${clampHex(s.color) || "000000"}">` +
    `<a:alpha val="${Math.round(Math.max(0, Math.min(1, s.opacity)) * 100000)}"/>` +
    `</a:srgbClr></a:outerShdw>`
  );
}
