/**
 * Brand connector primitives — arrows, rules and process rails.
 *
 * Single source of truth for every "line" that carries meaning on a slide:
 * agenda / footer hairlines, process rails, step connectors and directional
 * arrows. All of them are drawn from the division accent (via `accent-tokens`)
 * so switching divisions re-colours the whole flow language at once.
 *
 * House style:
 *  - lines fade at their tails (never a hard-stopped border)
 *  - arrows are a thin shaft + open chevron head, not a filled triangle
 *  - caps sit on the accent, bodies sit on a low-alpha accent wash
 *  - everything decorative is marked `aria-hidden` + `data-decorative` so the
 *    WCAG auto-fixer leaves the geometry alone.
 */
import * as React from "react";
import { hexA, FALLBACK_ACCENT } from "@/lib/accent-tokens";

type Axis = "x" | "y";
export type ArrowDirection = "right" | "left" | "up" | "down";

const acc = (accent?: string | null) => accent || FALLBACK_ACCENT;

const ANGLE: Record<ArrowDirection, number> = {
  right: 0,
  down: 90,
  left: 180,
  up: 270,
};

/* ── Arrow ──────────────────────────────────────────────────────────────── */

export interface FlowArrowProps {
  accent?: string | null;
  /** Glyph box size in px (the shaft spans it). */
  size?: number;
  direction?: ArrowDirection;
  /** Stroke weight; scales with size by default. */
  weight?: number;
  /** Draw a soft accent halo behind the glyph (dark surfaces / accent chips). */
  glow?: boolean;
  /** Override the stroke colour (e.g. on an accent-filled chip). */
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Stylised directional arrow: tapered accent shaft + open chevron head.
 * Replaces raw lucide `ArrowRight` inside slide modules.
 */
export function FlowArrow({
  accent,
  size = 24,
  direction = "right",
  weight,
  glow = false,
  color,
  className,
  style,
}: FlowArrowProps) {
  const a = acc(accent);
  const stroke = color || a;
  const w = weight ?? Math.max(1.5, size * 0.075);
  const gid = React.useId().replace(/[:]/g, "");
  return (
    <svg
      aria-hidden
      data-decorative
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{
        display: "block",
        transform: `rotate(${ANGLE[direction]}deg)`,
        filter: glow ? `drop-shadow(0 0 6px ${hexA(a, 0.45)})` : undefined,
        overflow: "visible",
        ...style,
      }}
    >
      <defs>
        <linearGradient id={`fa-${gid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={stroke} stopOpacity={color ? 0.45 : 0.12} />
          <stop offset="55%" stopColor={stroke} stopOpacity={color ? 0.85 : 0.65} />
          <stop offset="100%" stopColor={stroke} stopOpacity="1" />
        </linearGradient>
      </defs>
      <line
        x1="1.5"
        y1="12"
        x2="20"
        y2="12"
        stroke={`url(#fa-${gid})`}
        strokeWidth={w}
        strokeLinecap="round"
      />
      <polyline
        points="14.5,6.2 21,12 14.5,17.8"
        fill="none"
        stroke={stroke}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Label + arrow pair used for in-slide CTAs / "next step" cues. */
export function ArrowLabel({
  children,
  accent,
  size = 20,
  color,
  className,
  style,
}: {
  children: React.ReactNode;
  accent?: string | null;
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: 14, ...style }}>
      <span>{children}</span>
      <FlowArrow accent={accent} color={color} size={size} />
    </span>
  );
}

/* ── Rules ──────────────────────────────────────────────────────────────── */

export interface AccentRuleProps {
  accent?: string | null;
  axis?: Axis;
  /** Line weight in px. */
  thickness?: number;
  /** 0-1 peak opacity of the accent body. */
  emphasis?: number;
  /** Solid accent cap at the leading end (agenda rows, section rules). */
  cap?: boolean;
  /** Cap length in px (or height on the y axis). */
  capLength?: number;
  /** Fade the trailing tail out instead of holding the wash. */
  fade?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Brand hairline: a low-alpha accent body with an optional solid accent cap and
 * a faded tail. Use instead of `border-t` / `border-l` on slide surfaces.
 */
export function AccentRule({
  accent,
  axis = "x",
  thickness = 1,
  emphasis = 0.55,
  cap = false,
  capLength = 56,
  fade = true,
  className,
  style,
}: AccentRuleProps) {
  const a = acc(accent);
  const dir = axis === "x" ? "90deg" : "180deg";
  const body = fade
    ? `linear-gradient(${dir}, ${hexA(a, emphasis)} 0%, ${hexA(a, emphasis * 0.42)} 46%, ${hexA(a, 0)} 100%)`
    : `linear-gradient(${dir}, ${hexA(a, emphasis)} 0%, ${hexA(a, emphasis * 0.5)} 100%)`;
  return (
    <div
      aria-hidden
      data-decorative
      className={className}
      style={{
        position: "relative",
        flex: "none",
        width: axis === "x" ? "100%" : thickness,
        height: axis === "x" ? thickness : "100%",
        background: body,
        ...style,
      }}
    >
      {cap && (
        <span
          aria-hidden
          data-decorative
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: axis === "x" ? capLength : thickness,
            height: axis === "x" ? thickness : capLength,
            background: a,
          }}
        />
      )}
    </div>
  );
}

/* ── Process rail ───────────────────────────────────────────────────────── */

export interface ProcessRailProps {
  accent?: string | null;
  axis?: Axis;
  /** Number of node ticks; positions are evenly distributed. */
  nodes?: number;
  /** Explicit node offsets in percent (overrides `nodes`). */
  nodeOffsets?: number[];
  thickness?: number;
  /** Terminate the rail with a chevron head (a flow, not just a divider). */
  arrow?: boolean;
  /** Node dot diameter. */
  nodeSize?: number;
  /** Ring colour behind each node (usually the slide surface). */
  nodeRing?: string;
  /** Dashed rail for "planned / future" phases. */
  dashed?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * The accent line a process sits on: gradient rail, accent node dots and an
 * optional chevron terminal. Absolutely positioned by the caller.
 */
export function ProcessRail({
  accent,
  axis = "x",
  nodes = 0,
  nodeOffsets,
  thickness = 2,
  arrow = false,
  nodeSize = 12,
  nodeRing,
  dashed = false,
  className,
  style,
}: ProcessRailProps) {
  const a = acc(accent);
  const horizontal = axis === "x";
  const offsets =
    nodeOffsets ??
    (nodes > 0
      ? Array.from({ length: nodes }, (_, i) => (nodes === 1 ? 0 : (i / (nodes - 1)) * 100))
      : []);
  const railBg = dashed
    ? `repeating-linear-gradient(${horizontal ? "90deg" : "180deg"}, ${hexA(a, 0.6)} 0 10px, ${hexA(a, 0)} 10px 20px)`
    : `linear-gradient(${horizontal ? "90deg" : "180deg"}, ${hexA(a, 0.14)} 0%, ${hexA(a, 0.75)} 34%, ${a} 100%)`;

  return (
    <div
      aria-hidden
      data-decorative
      className={className}
      style={{
        position: "absolute",
        width: horizontal ? "100%" : thickness,
        height: horizontal ? thickness : "100%",
        ...style,
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: railBg }} />
      {offsets.map((p, i) => (
        <span
          key={i}
          aria-hidden
          data-decorative
          style={{
            position: "absolute",
            left: horizontal ? `${p}%` : "50%",
            top: horizontal ? "50%" : `${p}%`,
            transform: "translate(-50%, -50%)",
            width: nodeSize,
            height: nodeSize,
            borderRadius: "50%",
            background: a,
            boxShadow: nodeRing ? `0 0 0 4px ${nodeRing}` : `0 0 0 4px ${hexA(a, 0.14)}`,
          }}
        />
      ))}
      {arrow && (
        <FlowArrow
          accent={a}
          size={Math.max(18, thickness * 9)}
          direction={horizontal ? "right" : "down"}
          style={{
            position: "absolute",
            ...(horizontal
              ? { right: -6, top: "50%", transform: "translate(100%, -50%)" }
              : { bottom: -6, left: "50%", transform: "translate(-50%, 100%) rotate(90deg)" }),
          }}
        />
      )}
    </div>
  );
}

/** Single step marker: accent dot on a surface ring, for use off-rail. */
export function StepNode({
  accent,
  size = 14,
  ring,
  className,
  style,
}: {
  accent?: string | null;
  size?: number;
  ring?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const a = acc(accent);
  return (
    <span
      aria-hidden
      data-decorative
      className={className}
      style={{
        display: "block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: a,
        boxShadow: ring ? `0 0 0 4px ${ring}` : `0 0 0 4px ${hexA(a, 0.16)}`,
        ...style,
      }}
    />
  );
}
