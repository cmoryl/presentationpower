/**
 * HERO COPY FOCUS — feathered soft-focus field behind hero copy
 * ---------------------------------------------------------------------------
 * The legibility problem with photographic mastheads is that a full-band scrim
 * flattens the picture while a plate/box behind the words looks pasted on. This
 * layer does what a photographer does instead: it throws the copy zone *out of
 * focus* and lifts it a touch, with an elliptical feather that dissolves to
 * nothing long before it reaches an edge. No rectangle, no visible seam, no
 * self-contained panel — just a defocused pool of the photograph itself.
 *
 * Composition is anchored on the rule of thirds: the field centres on a
 * third-line intersection (and is sized in thirds), so the copy block, the
 * focus pool and the picture's own subject share one grid.
 *
 * Export-safe by construction: it is a real <img> with `filter: blur()` plus a
 * `mask-image` feather — no `backdrop-filter`, which rasterisers drop.
 */

import type { CSSProperties } from "react";
import { heroImageStyle, type PrintHeroAdjust } from "@/lib/print-hero-transform";

/** Authorable strength of the soft-focus field. */
export type HeroCopyFocusStrength = "off" | "soft" | "medium" | "strong";

/** Rule-of-thirds anchor for the copy zone. */
export type HeroCopyFocusZone =
  | "lower-left"
  | "lower-center"
  | "lower-right"
  | "upper-left"
  | "upper-center"
  | "center-left";

type Preset = {
  /** Gaussian radius of the defocus, in template px. */
  blurPx: number;
  /** Peak alpha of the defocused plate. */
  alpha: number;
  /** Peak alpha of the tonal lift that guarantees the contrast floor. */
  liftAlpha: number;
  /** Ellipse size as a share of the band, before zone shaping. */
  spread: number;
};

const PRESETS: Record<Exclude<HeroCopyFocusStrength, "off">, Preset> = {
  soft: { blurPx: 14, alpha: 0.62, liftAlpha: 0.16, spread: 0.94 },
  medium: { blurPx: 22, alpha: 0.82, liftAlpha: 0.26, spread: 1 },
  strong: { blurPx: 34, alpha: 0.94, liftAlpha: 0.38, spread: 1.08 },
};

/** Third-line intersections — the composition grid the field is built on. */
const ZONES: Record<HeroCopyFocusZone, { x: number; y: number; w: number; h: number }> = {
  "lower-left": { x: 33.3, y: 78, w: 78, h: 74 },
  "lower-center": { x: 50, y: 80, w: 92, h: 68 },
  "lower-right": { x: 66.6, y: 78, w: 78, h: 74 },
  "upper-left": { x: 33.3, y: 28, w: 78, h: 66 },
  "upper-center": { x: 50, y: 25, w: 92, h: 60 },
  "center-left": { x: 33.3, y: 50, w: 74, h: 82 },
};

/**
 * Feather profile: opaque through the copy block, then a long ramp to zero so
 * the field has no discernible boundary at any print size.
 */
function feather(w: number, h: number): string {
  return [
    `radial-gradient(ellipse ${w.toFixed(1)}% ${h.toFixed(1)}% at var(--hcf-x) var(--hcf-y),`,
    "rgba(0,0,0,1) 0%,",
    "rgba(0,0,0,1) 34%,",
    "rgba(0,0,0,0.78) 52%,",
    "rgba(0,0,0,0.42) 68%,",
    "rgba(0,0,0,0.16) 84%,",
    "rgba(0,0,0,0) 100%)",
  ].join(" ");
}

export type HeroCopyFocusProps = {
  /** Photograph to defocus. When absent the layer renders nothing. */
  imageUrl?: string;
  /** Same non-destructive crop the sharp photo uses, so the pools register. */
  adjust?: PrintHeroAdjust;
  /** CSS object-position of the sharp photo, e.g. "50% 40%". */
  objectPosition?: string;
  zone?: HeroCopyFocusZone;
  strength?: HeroCopyFocusStrength;
  mode?: "light" | "dark";
  /** px → container-query unit converter from the host layout. */
  cq?: (v: number) => string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Soft-focus legibility field. Renders two stacked, identically masked layers:
 * a blurred copy of the photograph and a tonal lift in the page's own ink
 * direction (toward paper on light pages, toward navy on dark ones).
 */
export function HeroCopyFocus({
  imageUrl,
  adjust,
  objectPosition = "50% 50%",
  zone = "lower-left",
  strength = "medium",
  mode = "dark",
  cq,
  className,
  style,
}: HeroCopyFocusProps) {
  if (!imageUrl || strength === "off") return null;

  const preset = PRESETS[strength];
  const z = ZONES[zone];
  const mask = feather(z.w * preset.spread, z.h * preset.spread);
  const blur = cq ? cq(preset.blurPx) : `${preset.blurPx}px`;
  const lift = mode === "dark" ? "3, 0, 44" : "255, 255, 255";

  const shell: CSSProperties = {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    pointerEvents: "none",
    // Third-line anchor, exposed as vars so both layers share one origin.
    ["--hcf-x" as string]: `${z.x}%`,
    ["--hcf-y" as string]: `${z.y}%`,
    WebkitMaskImage: mask,
    maskImage: mask,
    ...style,
  };

  return (
    <div aria-hidden className={className} data-hero-copy-focus={zone} style={shell}>
      <img
        alt=""
        src={imageUrl}
        style={{
          position: "absolute",
          // Bleed the blurred plate past the band so the Gaussian never
          // samples transparent pixels and darken the corners.
          inset: `calc(-1 * ${blur})`,
          width: `calc(100% + 2 * ${blur})`,
          height: `calc(100% + 2 * ${blur})`,
          objectFit: "cover",
          objectPosition,
          opacity: preset.alpha,
          ...heroImageStyle(adjust, objectPosition),
          filter: [
            heroImageStyle(adjust, objectPosition).filter,
            `blur(${blur})`,
            mode === "dark" ? "saturate(78%) brightness(0.7)" : "saturate(72%) brightness(1.16)",
          ]
            .filter(Boolean)
            .join(" "),
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: `rgba(${lift}, ${preset.liftAlpha})`,
        }}
      />
    </div>
  );
}

/** Map a hero `copyZone` / alignment to its rule-of-thirds focus anchor. */
export function heroFocusZone(
  align: "left" | "center" | "right" | undefined,
  band: "lower" | "upper" | "center" = "lower",
): HeroCopyFocusZone {
  const side = align === "center" ? "center" : align === "right" ? "right" : "left";
  if (band === "center") return "center-left";
  if (band === "upper") return side === "center" ? "upper-center" : "upper-left";
  return side === "center" ? "lower-center" : side === "right" ? "lower-right" : "lower-left";
}
