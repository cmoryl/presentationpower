// ─── MV-FUNNEL styling model ──────────────────────────────────────────────
// Per-slide funnel appearance. Everything defaults to the active brand theme
// (tokens.primary → tokens.accent), so a slide with no `funnelStyle` renders
// exactly as before. Stored on slide content under the `funnelStyle` key.

import type { CSSProperties } from "react";
import type { BrandMode } from "./taxonomy";

export type FunnelSheen = "none" | "soft" | "standard" | "high";
export type FunnelGhost = "off" | "subtle" | "standard" | "bold";
export type FunnelChipStyle = "tint" | "outline" | "solid" | "bare";

export type FunnelStyle = {
  /** Band gradient start. Defaults to the brand primary. */
  colorFrom?: string;
  /** Band gradient end. Defaults to the brand accent. */
  colorTo?: string;
  /** How much the bands fade toward the bottom of the funnel (0–60%). */
  fade?: number;
  sheen?: FunnelSheen;
  ghost?: FunnelGhost;
  chipStyle?: FunnelChipStyle;
};

export type ResolvedFunnelStyle = {
  colorFrom: string;
  colorTo: string;
  fade: number;
  sheen: FunnelSheen;
  ghost: FunnelGhost;
  chipStyle: FunnelChipStyle;
};

export const FUNNEL_SHEEN_OPTIONS: Array<{ value: FunnelSheen; label: string }> = [
  { value: "none", label: "None (flat)" },
  { value: "soft", label: "Soft" },
  { value: "standard", label: "Standard (default)" },
  { value: "high", label: "High gloss" },
];

export const FUNNEL_GHOST_OPTIONS: Array<{ value: FunnelGhost; label: string }> = [
  { value: "off", label: "Hidden" },
  { value: "subtle", label: "Subtle" },
  { value: "standard", label: "Standard (default)" },
  { value: "bold", label: "Bold" },
];

export const FUNNEL_CHIP_OPTIONS: Array<{ value: FunnelChipStyle; label: string }> = [
  { value: "tint", label: "Tinted pill (default)" },
  { value: "outline", label: "Outline only" },
  { value: "solid", label: "Solid accent" },
  { value: "bare", label: "Text only" },
];

const SHEEN_ALPHA: Record<FunnelSheen, { base: number; hover: number }> = {
  none: { base: 0, hover: 0 },
  soft: { base: 12, hover: 18 },
  standard: { base: 22, hover: 30 },
  high: { base: 38, hover: 48 },
};

const GHOST_ALPHA: Record<FunnelGhost, { base: number; hover: number }> = {
  off: { base: 0, hover: 0 },
  subtle: { base: 0.04, hover: 0.07 },
  standard: { base: 0.07, hover: 0.12 },
  bold: { base: 0.16, hover: 0.24 },
};

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(String(v)) ? (v as T) : fallback;
}

/** Read a (possibly malformed) `content.funnelStyle` blob into a safe object. */
export function readFunnelStyle(raw: unknown): FunnelStyle {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const fade = Number(r.fade);
  return {
    colorFrom: str(r.colorFrom),
    colorTo: str(r.colorTo),
    fade: Number.isFinite(fade) ? Math.max(0, Math.min(60, fade)) : undefined,
    sheen: str(r.sheen) as FunnelSheen | undefined,
    ghost: str(r.ghost) as FunnelGhost | undefined,
    chipStyle: str(r.chipStyle) as FunnelChipStyle | undefined,
  };
}

/** Merge a slide's overrides with the brand-theme defaults. */
export function resolveFunnelStyle(raw: unknown, brand: BrandMode): ResolvedFunnelStyle {
  const s = readFunnelStyle(raw);
  return {
    colorFrom: s.colorFrom || brand.tokens.primary,
    colorTo: s.colorTo || brand.tokens.accent,
    fade: s.fade ?? 34,
    sheen: pick(s.sheen, ["none", "soft", "standard", "high"] as const, "standard"),
    ghost: pick(s.ghost, ["off", "subtle", "standard", "bold"] as const, "standard"),
    chipStyle: pick(s.chipStyle, ["tint", "outline", "solid", "bare"] as const, "tint"),
  };
}

/** Band background gradient for a stage at `depth` (0 = top, 1 = bottom). */
export function funnelBandBackground(style: ResolvedFunnelStyle, depth: number): string {
  const f = style.fade;
  const a = Math.round(96 - depth * f);
  const b = Math.round(70 - depth * f);
  return `linear-gradient(112deg,
    color-mix(in oklab, ${style.colorFrom} ${Math.max(20, a)}%, transparent),
    color-mix(in oklab, ${style.colorTo} ${Math.max(14, b)}%, ${style.colorFrom}))`;
}

export function funnelSheenBackground(style: ResolvedFunnelStyle, active: boolean): string {
  const { base, hover } = SHEEN_ALPHA[style.sheen];
  const alpha = active ? hover : base;
  if (alpha <= 0) return "none";
  return `radial-gradient(120% 100% at 8% 0%, color-mix(in oklab, white ${alpha}%, transparent), transparent 60%)`;
}

export function funnelGhostOpacity(style: ResolvedFunnelStyle, active: boolean): number {
  const { base, hover } = GHOST_ALPHA[style.ghost];
  return active ? hover : base;
}

/** Inline style for the between-stage drop-off chip. */
export function funnelChipStyle(
  style: ResolvedFunnelStyle,
  inkStrong: string,
  hasDrop: boolean,
): CSSProperties {
  const accent = style.colorTo;
  const common: CSSProperties = {
    padding: "5px 14px",
    fontSize: 13,
    letterSpacing: "0.22em",
    fontWeight: 600,
    opacity: hasDrop ? 0.85 : 0.4,
    color: inkStrong,
  };
  switch (style.chipStyle) {
    case "outline":
      return {
        ...common,
        background: "transparent",
        border: `1px solid color-mix(in oklab, ${accent} 55%, transparent)`,
      };
    case "solid":
      return {
        ...common,
        background: accent,
        border: `1px solid ${accent}`,
        color: "color-mix(in oklab, black 82%, transparent)",
      };
    case "bare":
      return { ...common, background: "transparent", border: "1px solid transparent" };
    case "tint":
    default:
      return {
        ...common,
        background: `color-mix(in oklab, ${accent} 12%, transparent)`,
        border: `1px solid color-mix(in oklab, ${accent} 26%, transparent)`,
      };
  }
}
