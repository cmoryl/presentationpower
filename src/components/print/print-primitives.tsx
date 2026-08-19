// Shared primitives for the Spotlight / EBrochure / Adaptor-Brief layouts.
// Extracted from the three layouts that were built in parallel and had drifted
// close-but-not-identical copies of the same helpers.
//
// SCOPE — machinery only. Layout structure stays inside each template so they
// remain faithful to their own port; only tokens, glass, chips, icons, and the
// page/aurora geometry live here.

import type { CSSProperties } from "react";
import type { PrintDensity, PrintPageSize } from "@/lib/print-assets.types";

// Template canvas width — everything sizes against this via `cqw` so the
// layout scales identically at any preview or export DPI.
export const PAGE_W = 816;

// ---------------------------------------------------------------------------
// EyebrowChip — small uppercase label with an integrated legibility scrim.
// Guarantees contrast regardless of hero photo / accent underneath. Used
// systemically across all print templates so eyebrows can't drift.
// ---------------------------------------------------------------------------
export function PrintEyebrow({
  label,
  mode,
  accent,
  cq: cqFn,
  onDark = false,
}: {
  label: string;
  mode: "light" | "dark";
  accent: string;
  cq: (v: number) => string;
  /** Force the on-photo variant (used inside hero photo bands regardless of page mode). */
  onDark?: boolean;
}) {
  const dark = mode === "dark" || onDark;
  return (
    <div
      className="inline-flex items-center"
      style={{
        gap: cqFn(6),
        padding: `${cqFn(4)} ${cqFn(9)}`,
        borderRadius: 999,
        // Small backing chip so the eyebrow always has its own local contrast.
        background: dark
          ? `linear-gradient(180deg, color-mix(in srgb, ${accent} 20%, rgba(6,4,32,0.72)), rgba(6,4,32,0.72))`
          : `linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.82))`,
        border: dark
          ? `1px solid color-mix(in srgb, ${accent} 34%, rgba(255,255,255,0.14))`
          : `1px solid color-mix(in srgb, ${accent} 22%, rgba(3,0,44,0.10))`,
        boxShadow: dark ? "0 1px 0 rgba(0,0,0,0.15)" : "0 1px 0 rgba(3,0,44,0.05)",
        backdropFilter: "blur(6px) saturate(140%)",
      }}
    >
      <span
        aria-hidden
        style={{
          width: cqFn(6),
          height: cqFn(6),
          borderRadius: 999,
          background: accent,
          boxShadow: `0 0 ${cqFn(6)} ${accent}`,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: cqFn(8.5),
          fontWeight: 700,
          letterSpacing: "0.16em",
          color: dark ? "#F5F4FF" : "#03002C",
          lineHeight: 1,
        }}
      >
        {label.toUpperCase()}
      </span>
    </div>
  );
}

/**
 * Localized text-backing scrim that travels with the hero copy block rather
 * than the photo. Renders as a soft vertical gradient panel behind title +
 * tagline so bright/low-contrast photos can't wash the type out.
 * Position the parent relatively and put this as the first child.
 */
export function heroCopyScrimStyle(mode: "light" | "dark"): CSSProperties {
  const anchor = mode === "dark" ? "6,4,32" : "255,255,255";
  return {
    position: "absolute",
    inset: `-4% -6% -8% -6%`,
    background: `linear-gradient(180deg, rgba(${anchor},0.82) 0%, rgba(${anchor},0.66) 55%, rgba(${anchor},0) 100%)`,
    filter: "blur(2px)",
    borderRadius: "10%",
    pointerEvents: "none",
    zIndex: 0,
  };
}

/** CSS line-clamp — graceful truncation for slots that fill with AI copy. */
export function clampLines(lines: number): CSSProperties {
  return {
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };
}

/** Template-px → container-relative unit (cqw against PAGE_W). */
export const cq = (px: number) => `${((px * 100) / PAGE_W).toFixed(3)}cqw`;

export function pageAspect(size: PrintPageSize): string {
  switch (size) {
    case "A4":
      return "8.2677 / 11.6929";
    case "Letter":
      return "8.5 / 11";
    case "Square":
      return "1 / 1";
  }
}

// Aurora is authored 1280×720 landscape; re-project into portrait so orbs
// bleed from the correct edges instead of being cropped.
export function auroraAspect(size: PrintPageSize): { w: number; h: number } {
  switch (size) {
    case "A4":
      return { w: Math.round((1280 * 8.2677) / 11.6929), h: 1280 };
    case "Letter":
      return { w: Math.round((1280 * 8.5) / 11), h: 1280 };
    case "Square":
      return { w: 1280, h: 1280 };
  }
}

export function pagePadX(d: PrintDensity): number {
  return d === "compact" ? 36 : d === "airy" ? 52 : 44;
}
// Top padding is intentionally per-template — Spotlight opens tight,
// EBrochure and Adaptor-Brief breathe more. Pass a base + variance.
export function pagePadTop(d: PrintDensity, base = 34, variance = 6): number {
  return d === "compact" ? base - variance : d === "airy" ? base + variance + 4 : base;
}

// ---------------------------------------------------------------------------
// Glass tokens — solid template cards become frosted panels with the division
// accent glowing softly behind. Panel opacity tuned to keep 9–11px template
// type legible over the 75%-opacity portrait-projected aurora.
// ---------------------------------------------------------------------------
export function glass(mode: "light" | "dark", accent: string): CSSProperties {
  if (mode === "dark") {
    return {
      background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 6%, rgba(10,8,36,0.62)), rgba(6,4,32,0.55))`,
      border: `1px solid color-mix(in srgb, ${accent} 22%, rgba(255,255,255,0.08))`,
      backdropFilter: "blur(14px) saturate(140%)",
      boxShadow: `0 ${cq(10)} ${cq(28)} rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.04)`,
    };
  }
  return {
    background: `linear-gradient(180deg, rgba(255,255,255,0.90), rgba(255,255,255,0.78))`,
    border: `1px solid color-mix(in srgb, ${accent} 18%, rgba(255,255,255,0.75))`,
    backdropFilter: "blur(14px) saturate(140%)",
    boxShadow: `0 ${cq(10)} ${cq(28)} rgba(3,0,44,0.10), inset 0 0 0 1px rgba(255,255,255,0.55)`,
  };
}

// Accent chip (soft accent circle behind an outline glyph). `warm` picks the
// EBrochure warm-tint variant (Challenge / Impact cards).
export function chipStyle(mode: "light" | "dark", accent: string, warm = false): CSSProperties {
  if (warm) {
    return {
      background:
        mode === "dark"
          ? `color-mix(in srgb, ${accent} 14%, rgba(60,42,20,0.55))`
          : `color-mix(in srgb, #F6D9B6 45%, #ffffff)`,
      border:
        mode === "dark"
          ? `1px solid color-mix(in srgb, ${accent} 22%, rgba(255,255,255,0.05))`
          : `1px solid color-mix(in srgb, #F6D9B6 40%, rgba(255,255,255,0.9))`,
    };
  }
  return {
    background:
      mode === "dark"
        ? `color-mix(in srgb, ${accent} 26%, rgba(6,4,32,0.7))`
        : `color-mix(in srgb, ${accent} 22%, #ffffff)`,
    border:
      mode === "dark"
        ? `1px solid color-mix(in srgb, ${accent} 32%, rgba(255,255,255,0.08))`
        : `1px solid color-mix(in srgb, ${accent} 26%, rgba(255,255,255,0.9))`,
  };
}

// ---------------------------------------------------------------------------
// Icons — Heroicons-outline paths used by all three templates.
// ---------------------------------------------------------------------------
export type IconName =
  | "sparkles"
  | "users"
  | "globe-alt"
  | "language"
  | "squares-2x2"
  | "arrow-trending-up"
  | "chat"
  | "check"
  | "target"
  | "globe-flat"
  | "trending"
  | "star"
  | "bolt"
  | "clock"
  | "grid"
  | "clock-adapt"
  | "trigger"
  | "learn"
  | "mail"
  | "phone"
  | "link"
  | "map-pin"
  | "document"
  | "shield"
  | "chart-bar"
  | "scale"
  | "quote"
  | "badge";


export const ICON_PATHS: Record<IconName, string> = {
  sparkles:
    "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z",
  users:
    "M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72M18 18.72c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719M18 18.72a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z",
  "globe-alt":
    "M12 21a9 9 0 0 0 0-18m0 18a9 9 0 0 1 0-18m0 18c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3M3.6 9h16.8M3.6 15h16.8",
  language:
    "m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0V3m0 2.25c2.223 5.298 5.707 9.716 10.334 12.253M9 5.25c1.12 0 2.233.038 3.334.114",
  "squares-2x2":
    "M3.75 6a2.25 2.25 0 0 1 2.25-2.25h1.5A2.25 2.25 0 0 1 9.75 6v1.5A2.25 2.25 0 0 1 7.5 9.75H6A2.25 2.25 0 0 1 3.75 7.5V6ZM3.75 16.5A2.25 2.25 0 0 1 6 14.25h1.5a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 7.5 20.25H6A2.25 2.25 0 0 1 3.75 18v-1.5ZM14.25 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v1.5A2.25 2.25 0 0 1 18 9.75h-1.5a2.25 2.25 0 0 1-2.25-2.25V6ZM14.25 16.5A2.25 2.25 0 0 1 16.5 14.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-1.5A2.25 2.25 0 0 1 14.25 18v-1.5Z",
  "arrow-trending-up":
    "M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941",
  chat: "M21 11.5a8.38 8.38 0 0 1-9 8.4 8.5 8.5 0 0 1-3.9-.9L3 20l1-4.9A8.38 8.38 0 0 1 3.5 11a8.5 8.5 0 0 1 8.4-8.5 8.38 8.38 0 0 1 9.1 9z",
  check: "M4 12l5 5L20 6",
  target:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  "globe-flat": "M12 3a9 9 0 1 0 0 18M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18",
  trending: "M3 17l6-6 4 4 8-8M15 7h6v6",
  star: "M11.48 3.5a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z",
  bolt: "M13 3L4 14h6l-1 7 9-11h-6l1-7z",
  clock: "M12 6v6l4 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  "clock-adapt": "M12 8v4l3 3M12 3a9 9 0 1 0 9 9",
  trigger: "M4 6h16M4 12h10M4 18h16",
  learn: "M12 3l9 5-9 5-9-5 9-5zM3 12l9 5 9-5",
};

export function Icon({
  name,
  size,
  color,
  strokeWidth = 1.5,
}: {
  name: IconName;
  size: number | string;
  color: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ display: "block" }}
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

/** Path variant — for legacy Icon call sites still passing raw `d`. */
export function IconPath({
  d,
  size,
  color,
  strokeWidth = 1.5,
}: {
  d: string;
  size: number | string;
  color: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ display: "block" }}
    >
      <path d={d} />
    </svg>
  );
}
